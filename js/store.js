/* EDS O2-Planung — Speicher: Gerät (localStorage) und Server (Cloudflare Worker, Kurzcode → Berechnung).
 * Der Server ist optional: ohne ihn bleibt alles auf dem Gerät, und der Link trägt den Stand als Anhang mit. */

const API = String((typeof window !== 'undefined' && window.O2_CONFIG && window.O2_CONFIG.apiBase) || '').replace(/\/+$/, '');
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';        // ohne I, L, O, 0, 1
export const ID_RE = /^[A-HJKMNP-Z2-9]{6}$/;
export const KEEP_DAYS = 183;

const K_CALC = 'o2.calc.', K_MINE = 'o2.mine', K_PREFS = 'o2.prefs', K_PCFG = 'o2.pcfg.';
export const PCODE_RE = /^[a-z0-9]{3,20}$/;

const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ohne Speicher weiter */ } },
};

export function newId() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const prefs = {
  get: () => ls.get(K_PREFS, {}),
  set: (p) => ls.set(K_PREFS, { ...ls.get(K_PREFS, {}), ...p }),
};

export const local = {
  load: (id) => ls.get(K_CALC + id, null),
  save(calc) {
    if (!calc || !calc.id) return;
    ls.set(K_CALC + calc.id, calc);
    const mine = ls.get(K_MINE, []).filter((m) => m.id !== calc.id);
    mine.unshift({ id: calc.id, updated: calc.updated, title: calc.title || '' });
    ls.set(K_MINE, mine.slice(0, 20));
  },
  mine: () => ls.get(K_MINE, []),
  forget(id) { ls.del(K_CALC + id); ls.set(K_MINE, ls.get(K_MINE, []).filter((m) => m.id !== id)); },
};

/* ---------- Server ---------- */
let downUntil = 0;
export const remote = {
  configured: !!API,
  available: () => !!API && Date.now() >= downUntil,
  async get(id) {
    if (!remote.available()) return undefined;                     // undefined = nicht erreichbar, null = nicht vorhanden
    try {
      const r = await fetch(`${API}/c/${id}`, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch { downUntil = Date.now() + 60000; return undefined; }
  },
  async put(calc) {
    if (!remote.available()) return undefined;
    try {
      const r = await fetch(`${API}/c/${calc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: calc }), signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch { downUntil = Date.now() + 60000; return undefined; }
  },
};

/* ---------- Persönliche Konfiguration (Vorrat und Einstellungen unter einem selbst gewählten Kurzcode) ---------- */
export const profile = {
  cached: (code) => ls.get(K_PCFG + code, null),
  cache: (code, data) => ls.set(K_PCFG + code, data),
  /** → { data, updated } · null = Kurzcode gibt es nicht · undefined = Server nicht erreichbar */
  async get(code) {
    if (!remote.available()) return undefined;
    try {
      const r = await fetch(`${API}/p/${code}`, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch { return undefined; }
  },
  /** → { updated, created } · 'taken' = Kurzcode vergeben (nur bei create) · undefined = Server nicht erreichbar */
  async put(code, data, create) {
    if (!remote.available()) return undefined;
    try {
      const r = await fetch(`${API}/p/${code}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, create: !!create }), signal: AbortSignal.timeout(8000),
      });
      if (r.status === 409) return 'taken';
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch { return undefined; }
  },
};

/* ---------- Stand als Anhang im Link (lokaler Modus) ---------- */
const b64u = {
  enc: (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))),
};
const r3 = (v) => Math.round(v * 1000) / 1000;

export function encodeSnap(c) {
  const s = c.set;
  return b64u.enc(JSON.stringify([1, c.units.p === 'psi' ? 1 : 0, c.units.alt === 'm' ? 1 : 0,
    c.cyl.map((x) => [x.nr, r3(x.size), r3(x.p)]),
    [s.persons, s.sf, r3(s.startM), r3(s.rest), s.climb, s.sink, r3(s.factor), s.startU === 'ft' ? 1 : 0],
    c.prof.map((l) => [Math.round(l.alt), r3(l.dur)]),
    Math.floor((Date.parse(c.updated) || Date.now()) / 1000),
    c.title || '', s.trans === false ? 0 : 1]));
}
export function decodeSnap(str) {
  try {
    const a = JSON.parse(b64u.dec(str));
    if (!Array.isArray(a) || a[0] !== 1) return null;
    const s = a[4];
    return {
      units: { p: a[1] ? 'psi' : 'bar', alt: a[2] ? 'm' : 'ft' },
      cyl: a[3].map((x) => ({ nr: String(x[0]), size: +x[1], p: +x[2] })),
      set: { persons: +s[0], sf: +s[1], startM: +s[2], rest: +s[3], climb: +s[4], sink: +s[5], factor: +s[6] || 1, startU: s[7] ? 'ft' : 'm', trans: a[8] !== 0 },
      title: typeof a[7] === 'string' ? a[7].slice(0, 60) : '',
      prof: a[5].map((l) => ({ alt: +l[0], dur: +l[1] })),
      updated: a[6] ? new Date(a[6] * 1000).toISOString() : null,
    };
  } catch { return null; }
}

/**
 * Übergabe eines Fahrtprofils aus einer anderen App (Fahrtbriefing): «#i.<Anhang>».
 * Anhang = base64url von JSON { v:1, t: Titel, l: [[Höhe ft, Dauer h], …], s: 1 = Verlauf ohne zu ergänzende Übergänge }.
 */
export function encodeImport(o) { return 'i.' + b64u.enc(JSON.stringify({ v: 1, t: o.title || '', l: o.levels.map((l) => [Math.round(l.alt), r3(l.dur)]), s: o.steps ? 1 : 0 })); }
export function parseImport(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (!/^i\./.test(h)) return null;
  try {
    const o = JSON.parse(b64u.dec(h.slice(2)));
    if (!o || o.v !== 1 || !Array.isArray(o.l)) return null;
    const levels = o.l.filter((l) => Array.isArray(l) && Number.isFinite(+l[0]) && Number.isFinite(+l[1]) && +l[0] >= 0 && +l[0] <= 60000 && +l[1] >= 0 && +l[1] <= 200)
      .slice(0, 30).map((l) => ({ alt: +l[0], dur: +l[1] }));
    if (!levels.length) return null;
    return { title: typeof o.t === 'string' ? o.t.slice(0, 60) : '', levels, steps: !!o.s };
  } catch { return null; }
}

/** Hash «#CODE» oder «#CODE.ANHANG» zerlegen. */
export function parseHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  const i = h.indexOf('.');
  const id = (i < 0 ? h : h.slice(0, i)).toUpperCase();
  if (!ID_RE.test(id)) return { id: null, snap: null };
  return { id, snap: i < 0 ? null : decodeSnap(h.slice(i + 1)) };
}
