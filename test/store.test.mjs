// Link-Anhang (Stand im Link) und Übergabe eines Fahrtprofils.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSnap, decodeSnap, parseHash, encodeImport, parseImport, PCODE_RE } from '../js/store.js';

const calc = () => ({
  title: 'Alpenfahrt 17.10. – Säntis', updated: '2026-10-12T05:00:00.000Z', units: { p: 'bar', alt: 'ft' },
  cyl: [{ nr: '1', size: 2, p: 200 }, { nr: 'B7', size: 3.4, p: 187.5 }],
  set: { persons: 2, sf: 10, startM: 2800, startU: 'm', rest: 15, climb: 1.5, sink: 2, factor: 1.12, trans: false },
  prof: [{ alt: 8000, dur: 2 }, { alt: 12500, dur: 0.75 }],
});

test('Stand im Link: Titel, Umlaute und «ohne Übergänge» bleiben erhalten', () => {
  const c = calc(), back = decodeSnap(encodeSnap(c));
  assert.equal(back.title, c.title);
  assert.equal(back.set.trans, false);
  assert.deepEqual(back.cyl, c.cyl);
  assert.deepEqual(back.prof, c.prof);
  assert.equal(back.set.factor, 1.12);
  const p = parseHash('#abc234.' + encodeSnap(c));
  assert.equal(p.id, 'ABC234'); assert.equal(p.snap.title, c.title);
});

test('Stand im Link aus Version 0.1 (ohne Titel und Kennzeichen) bleibt lesbar', () => {
  const old = Buffer.from(JSON.stringify([1, 0, 0, [['1', 2, 200]], [2, 10, 2800, 15, 1.5, 2, 1, 0], [[8000, 2]], 1791700000])).toString('base64url');
  const back = decodeSnap(old);
  assert.equal(back.title, ''); assert.equal(back.set.trans, true); assert.equal(back.prof[0].alt, 8000);
});

test('Übergabe eines Fahrtprofils', () => {
  const h = '#' + encodeImport({ title: '2026-017 · HB-QWZ', levels: [{ alt: 9000.4, dur: 1.5 }, { alt: 14000, dur: 2 }], steps: true });
  const imp = parseImport(h);
  assert.equal(imp.title, '2026-017 · HB-QWZ'); assert.equal(imp.steps, true);
  assert.deepEqual(imp.levels, [{ alt: 9000, dur: 1.5 }, { alt: 14000, dur: 2 }]);
  assert.equal(parseHash(h).id, null, 'kein Kurzcode');
  assert.equal(parseImport('#i.kaputt'), null);
  assert.equal(parseImport('#ABC234'), null);
  const many = '#' + encodeImport({ levels: Array.from({ length: 50 }, (_, i) => ({ alt: 9000 + i * 100, dur: 0.1 })) });
  assert.equal(parseImport(many).levels.length, 30, 'höchstens 30 Höhenstufen');
  const bad = '#i.' + Buffer.from(JSON.stringify({ v: 1, l: [[-5, 1], ['x', 1], [9000, 999], [9000, 1]] })).toString('base64url');
  assert.deepEqual(parseImport(bad).levels, [{ alt: 9000, dur: 1 }], 'ungültige Zeilen fallen weg');
});

test('Persönlicher Kurzcode: Form', () => {
  for (const ok of ['bwi', 'abc123', 'x'.repeat(20)]) assert.ok(PCODE_RE.test(ok), ok);
  for (const bad of ['ab', 'BWI', 'a b', 'bä1', 'x'.repeat(21), '']) assert.ok(!PCODE_RE.test(bad), bad);
});
