// Speicher-Worker gegen einen KV-Ersatz im Speicher (ohne Cloudflare).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { clean } from '../worker/src/index.js';

const kv = () => {
  const m = new Map();
  return { m, opts: null, async get(k, type) { const v = m.get(k); return v == null ? null : (type === 'json' ? JSON.parse(v) : v); }, async put(k, v, o) { m.set(k, v); this.opts = o; } };
};
const env = () => ({ CALCS: kv(), ALLOWED_ORIGINS: 'https://o2.wicki.aero,http://localhost:8080', APP_VERSION: '0.1.0', KEEP_DAYS: '183' });
const calc = () => ({
  v: 1, id: 'ABCDEF', rev: 0, updated: '2026-10-11T18:00:00.000Z', units: { p: 'bar', alt: 'ft' },
  cyl: [{ nr: '1', size: 2, p: 200 }, { nr: '2', size: 2, p: 185 }],
  set: { persons: 2, sf: 10, startM: 2800, startU: 'm', rest: 15, climb: 1.5, sink: 2, factor: 1 },
  prof: [{ alt: 8000, dur: 2 }, { alt: 12000, dur: 3 }], log: [],
});
const call = (e, method, path, body, origin = 'https://o2.wicki.aero') => worker.fetch(new Request('https://o2-api.example' + path, {
  method, headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
}), e);

test('Speichern, Lesen, Revision und Aufbewahrung', async () => {
  const e = env();
  assert.equal((await call(e, 'GET', '/c/ABCDEF')).status, 404);
  const r1 = await call(e, 'PUT', '/c/ABCDEF', { data: calc() });
  assert.equal(r1.status, 200);
  const j1 = await r1.json();
  assert.equal(j1.rev, 1);
  assert.equal(e.CALCS.opts.expirationTtl, 183 * 86400);
  const days = (Date.parse(j1.expires) - Date.parse(j1.updated)) / 86400000;
  assert.equal(days, 183);
  const c2 = calc(); c2.cyl[0].p = 150;
  assert.equal((await (await call(e, 'PUT', '/c/abcdef', { data: c2 })).json()).rev, 2, 'Kleinschreibung im Code wird angenommen');
  const g = await (await call(e, 'GET', '/c/ABCDEF')).json();
  assert.equal(g.data.cyl[0].p, 150);
  assert.equal(g.data.set.startM, 2800);
  assert.equal(g.rev, 2);
});

test('Ungültiges wird abgelehnt', async () => {
  const e = env();
  assert.equal((await call(e, 'PUT', '/c/ABCDE1', { data: calc() })).status, 400, 'Code mit ausgeschlossenem Zeichen');
  assert.equal((await call(e, 'PUT', '/c/ABCDEF', { data: { foo: 1 } })).status, 422);
  const bad = calc(); bad.cyl[0].p = 'viel';
  assert.equal((await call(e, 'PUT', '/c/ABCDEF', { data: bad })).status, 422);
  const big = calc(); big.log = [{ t: 'x'.repeat(20000) }];
  assert.equal((await call(e, 'PUT', '/c/ABCDEF', { data: big })).status, 413);
  assert.equal((await call(e, 'DELETE', '/c/ABCDEF')).status, 405);
  assert.equal((await call(e, 'GET', '/irgendwas')).status, 404);
  assert.equal(e.CALCS.m.size, 0);
});

test('Fremde Felder werden nicht gespeichert', () => {
  const c = calc(); c.extra = '<script>'; c.set.hack = 1; c.cyl[0].note = 'x';
  const out = clean(c, 'ABCDEF');
  assert.equal(out.extra, undefined); assert.equal(out.set.hack, undefined); assert.equal(out.cyl[0].note, undefined);
});

test('CORS nur für die eigenen Adressen', async () => {
  const e = env();
  const ok = await call(e, 'OPTIONS', '/c/ABCDEF');
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://o2.wicki.aero');
  const no = await call(e, 'GET', '/health', null, 'https://fremd.example');
  assert.equal(no.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await no.json()).ok, true);
});

test('Versionsnummern der App stimmen überein (der Worker zählt eigenständig)', () => {
  const v = /version: '([\d.]+)'/.exec(readFileSync(new URL('../js/version.js', import.meta.url), 'utf8'))[1];
  assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), new RegExp(`VERSION = 'o2-v${v.replace(/\./g, '\\.')}'`), 'sw.js');
  assert.equal(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version, v, 'package.json');
  assert.match(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), new RegExp(`## ${v.replace(/\./g, '\\.')}`), 'CHANGELOG.md');
});

test('Service Worker kennt alle Dateien der App-Hülle', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const list = [...sw.matchAll(/'((?:css|js|fonts|icons|img)\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(list.length > 15);
  for (const f of list) assert.doesNotThrow(() => readFileSync(new URL('../' + f, import.meta.url)), f);
});

test('Worker-Version: wrangler.toml und worker/package.json gleich', () => {
  const v = JSON.parse(readFileSync(new URL('../worker/package.json', import.meta.url), 'utf8')).version;
  assert.match(readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8'), new RegExp(`APP_VERSION = "${v.replace(/\./g, '\\.')}"`));
});

/* ---------- 0.2.0: Titel, Profil ohne Übergänge, persönliche Konfiguration ---------- */
import { cleanProfile } from '../worker/src/index.js';

test('Titel und «ohne Übergänge» werden gespeichert', async () => {
  const e = env();
  const c = calc(); c.title = 'Alpenfahrt 17.10. ' + 'x'.repeat(80); c.set.trans = false;
  assert.equal((await call(e, 'PUT', '/c/ABCDEF', { data: c })).status, 200);
  const g = await (await call(e, 'GET', '/c/ABCDEF')).json();
  assert.equal(g.data.title.length, 60);
  assert.equal(g.data.set.trans, false);
  const old = calc();                                                // Stand ohne die neuen Felder (0.1.x)
  assert.equal((await call(e, 'PUT', '/c/ABCDEG', { data: old })).status, 200);
  const g2 = await (await call(e, 'GET', '/c/ABCDEG')).json();
  assert.equal(g2.data.title, ''); assert.equal(g2.data.set.trans, true);
});

test('Persönlicher Kurzcode: einmalig vergeben, laden, überschreiben', async () => {
  const e = env();
  const cfg = () => { const c = calc(); return { units: c.units, cyl: c.cyl, set: { ...c.set, factor: 1.3 }, prof: c.prof, title: 'x' }; };
  assert.equal((await call(e, 'GET', '/p/bwi')).status, 404);
  const r1 = await call(e, 'PUT', '/p/BWI', { data: cfg(), create: true });
  assert.equal(r1.status, 200);
  assert.equal((await r1.json()).created, true);
  assert.equal(e.CALCS.opts.expirationTtl, 730 * 86400);
  assert.equal((await call(e, 'PUT', '/p/bwi', { data: cfg(), create: true })).status, 409, 'vergeben');
  const g = await (await call(e, 'GET', '/p/Bwi')).json();
  assert.equal(g.data.cyl.length, 2);
  assert.equal(g.data.set.factor, 1, 'Verbrauchsfaktor gehört nicht zur Konfiguration');
  assert.equal(g.data.prof, undefined, 'kein Fahrtprofil');
  assert.equal(g.data.title, undefined);
  const c2 = cfg(); c2.cyl.push({ nr: '3', size: 3, p: 300 });
  assert.equal((await call(e, 'PUT', '/p/bwi', { data: c2 })).status, 200, 'eigene Konfiguration überschreiben');
  assert.equal((await (await call(e, 'GET', '/p/bwi')).json()).data.cyl.length, 3);
});

test('Persönlicher Kurzcode: Form und Daten', async () => {
  const e = env();
  const c = calc();
  for (const bad of ['ab', 'a-b', 'äöü', 'x'.repeat(21)]) assert.equal((await call(e, 'PUT', '/p/' + encodeURIComponent(bad), { data: c, create: true })).status >= 400, true, bad);
  assert.equal((await call(e, 'PUT', '/p/abc', { data: { cyl: [] }, create: true })).status, 422);
  assert.equal(cleanProfile(null), null);
  assert.equal(e.CALCS.m.size, 0);
});

test('Persönlicher Kurzcode: Laden verlängert die Aufbewahrung nach 30 Tagen', async () => {
  const e = env(), c = calc();
  await call(e, 'PUT', '/p/abc', { data: c, create: true });
  const rec = JSON.parse(e.CALCS.m.get('p:abc')); rec.seen = new Date(Date.now() - 40 * 86400000).toISOString();
  e.CALCS.m.set('p:abc', JSON.stringify(rec)); e.CALCS.opts = null;
  await call(e, 'GET', '/p/abc');
  assert.ok(e.CALCS.opts, 'neu geschrieben');
  e.CALCS.opts = null;
  await call(e, 'GET', '/p/abc');
  assert.equal(e.CALCS.opts, null, 'kein Schreiben bei jedem Laden');
});
