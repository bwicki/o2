/* EDS O2-Planung — Speicher für «Meine Berechnung» (Cloudflare Worker + KV).
 *
 *   GET  /c/<CODE>   → { data, rev, updated, expires }   oder 404
 *   PUT  /c/<CODE>   ← { data }  → { rev, updated, expires }
 *   GET  /health     → { ok, version }
 *
 * Offen, ohne Anmeldung: Wer den Kurzcode kennt, darf lesen und ändern (so gewollt, siehe README).
 * Jeder Schreibvorgang verlängert die Aufbewahrung um KEEP_DAYS; danach löscht KV den Eintrag selbst.
 * Gespeichert werden nur Rechenwerte (Zylinder, Einstellungen, Höhenstufen) — keine Personendaten. */

const ID_RE = /^[A-HJKMNP-Z2-9]{6}$/;
const MAX_BYTES = 16 * 1024;
const MAX_ROWS = 40;

const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/* Prüft die Form der Berechnung (wie normalize() in js/app.js); gibt eine bereinigte Kopie zurück oder null. */
export function clean(d, id) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const set = d.set, cyl = d.cyl, prof = d.prof, units = d.units || {};
  if (!set || typeof set !== 'object' || !Array.isArray(cyl) || !Array.isArray(prof)) return null;
  if (!cyl.length || cyl.length > MAX_ROWS || prof.length > MAX_ROWS) return null;
  const out = {
    v: 1, id,
    updated: /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(d.updated || '') ? d.updated : new Date().toISOString(),
    units: { p: units.p === 'psi' ? 'psi' : 'bar', alt: units.alt === 'm' ? 'm' : 'ft' },
    cyl: [], set: {}, prof: [], log: [],
  };
  for (const c of cyl) {
    if (!c || !num(c.size, 0, 200) || !num(c.p, 0, 400)) return null;
    out.cyl.push({ nr: String(c.nr ?? '').slice(0, 8), size: c.size, p: c.p });
  }
  for (const l of prof) {
    if (!l || !num(l.alt, 0, 60000) || !num(l.dur, 0, 200)) return null;
    out.prof.push({ alt: l.alt, dur: l.dur });
  }
  const lim = { persons: [1, 20], sf: [0, 300], startM: [0, 12000], rest: [0, 300], climb: [0.1, 20], sink: [0.1, 20], factor: [0.1, 10] };
  for (const [k, [lo, hi]] of Object.entries(lim)) {
    if (!num(set[k], lo, hi)) return null;
    out.set[k] = set[k];
  }
  out.set.startU = set.startU === 'ft' ? 'ft' : 'm';
  if (Array.isArray(d.log)) {                                        // Nachführ-Protokoll: nur klein und flach
    const log = d.log.slice(-20).filter((e) => e && typeof e === 'object' && !Array.isArray(e));
    if (JSON.stringify(log).length <= 4000) out.log = log;
  }
  return out;
}

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = { 'Vary': 'Origin' };
  if (allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, PUT, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

const json = (body, status, headers) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/health' || url.pathname === '/') {
      return json({ ok: true, app: 'o2-api', version: env.APP_VERSION || '', keepDays: Number(env.KEEP_DAYS) || 183 }, 200, h);
    }

    const m = /^\/c\/([A-Za-z0-9]{1,12})$/.exec(url.pathname);
    if (!m) return json({ error: 'not_found' }, 404, h);
    const id = m[1].toUpperCase();
    if (!ID_RE.test(id)) return json({ error: 'bad_code' }, 400, h);
    const keepDays = Number(env.KEEP_DAYS) || 183;
    const key = 'c:' + id;

    if (req.method === 'GET') {
      const rec = await env.CALCS.get(key, 'json');
      if (!rec) return json({ error: 'unknown' }, 404, h);
      return json(rec, 200, h);
    }

    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: 'too_large' }, 413, h);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400, h); }
      const data = clean(body && body.data, id);
      if (!data) return json({ error: 'bad_data' }, 422, h);
      const prev = await env.CALCS.get(key, 'json');
      const now = Date.now();
      const rec = {
        data,
        rev: ((prev && prev.rev) || 0) + 1,
        updated: new Date(now).toISOString(),
        expires: new Date(now + keepDays * 86400000).toISOString(),
      };
      await env.CALCS.put(key, JSON.stringify(rec), { expirationTtl: keepDays * 86400 });
      return json({ rev: rec.rev, updated: rec.updated, expires: rec.expires }, 200, h);
    }

    return json({ error: 'method' }, 405, { ...h, Allow: 'GET, PUT, OPTIONS' });
  },
};
