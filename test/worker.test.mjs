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

test('Versionsnummern stimmen überein', () => {
  const v = /version: '([\d.]+)'/.exec(readFileSync(new URL('../js/version.js', import.meta.url), 'utf8'))[1];
  assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), new RegExp(`VERSION = 'o2-v${v.replace(/\./g, '\\.')}'`), 'sw.js');
  assert.equal(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version, v, 'package.json');
  assert.match(readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8'), new RegExp(`APP_VERSION = "${v.replace(/\./g, '\\.')}"`), 'wrangler.toml');
  assert.match(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), new RegExp(`## ${v.replace(/\./g, '\\.')}`), 'CHANGELOG.md');
});

test('Service Worker kennt alle Dateien der App-Hülle', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const list = [...sw.matchAll(/'((?:css|js|fonts|icons|img)\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(list.length > 15);
  for (const f of list) assert.doesNotThrow(() => readFileSync(new URL('../' + f, import.meta.url)), f);
});
