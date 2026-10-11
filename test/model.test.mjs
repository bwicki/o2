// Tests des Rechenmodells: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { zO2, contentL, usableL, rateLph, compute, track, FT_PER_M } from '../js/model.js';
import { altText, parseAlt, durText, parseDur, pText, pFromUnit } from '../js/units.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} erwartet ${b} ± ${tol}, erhalten ${a}`);

test('Realgasfaktor Z gegen Referenzwerte (CoolProp)', () => {
  near(zO2(200, 15), 0.9313, 0.001);
  near(zO2(300, 15), 0.9738, 0.001);
  near(zO2(100, 15), 0.9407, 0.001);
  near(zO2(200, -20), 0.8569, 0.0015);
  near(zO2(139, 21.1), 0.9387, 0.001);
  near(zO2(0, 21.1), 0.9993, 0.0005);
});

test('Zylinderinhalt: Realgas liefert bei 200 bar rund 8 % mehr als Liter × bar', () => {
  near(contentL(2, 200), 434.9, 1.0);
  near(contentL(1, 300), 311.3, 1.0);
  near(contentL(2, 200) / (2 * 201), 1.082, 0.01);
  assert.equal(contentL(2, 0), 0);
  near(usableL(2, 200, 15), 402.2, 1.0);
  assert.equal(usableL(2, 10, 15), 0);
});

test('Verbrauchsfunktion reproduziert das Cylinder Duration Chart von Mountain High', () => {
  // [Inhalt L, Stunden EDS 10k, 15k, 18k, EDS-F 20k, 25k]
  const chart = [
    [113, 6.9, 3.4, 2.6, 1.8, 1.2], [165, 10.1, 4.9, 3.8, 2.6, 1.7], [248, 15.2, 7.4, 5.7, 3.9, 2.6],
    [415, 25.4, 12.3, 9.6, 6.6, 4.3], [647, 39.6, 19.2, 14.9, 10.3, 6.7], [682, 41.8, 20.2, 15.7, 10.8, 7.0],
    [515, 31.6, 15.3, 11.9, 8.2, 5.3], [1365, 83.6, 40.5, 31.5, 21.6, 14.1], [623, 38.2, 18.5, 14.4, 9.9, 6.4],
    [311, 19.1, 9.2, 7.2, 4.9, 3.2], [2180, 133.6, 64.7, 50.3, 34.5, 22.5], [3257, 199.6, 96.6, 75.2, 51.56, 33.6],
  ];
  const alts = [10000, 15000, 18000, 20000, 25000];
  for (const [cap, ...hours] of chart) hours.forEach((h, i) => {
    const mine = cap / rateLph(alts[i], 0);
    // Tabellenwerte sind auf 0.1 h gerundet: Toleranz 2 % plus halbe Rundungsstufe
    near(mine, h, h * 0.02 + 0.05, `${cap} L auf ${alts[i]} ft:`);
  });
});

test('Verbrauch: unter der Beginnhöhe null, Untergrenze unter 10 000 ft, Maske über FL180', () => {
  const start = 2800 * FT_PER_M;
  assert.equal(rateLph(8000, start), 0);
  near(rateLph(start, start), 13.5, 0.1);
  near(rateLph(7000, 2000 * FT_PER_M), 8, 1e-9);
  near(rateLph(12000, start), 23.28, 0.05);
  near(rateLph(18000, start), 43.32, 0.01);
  assert.ok(rateLph(18001, start) > 49 && rateLph(18001, start) < 50);
  near(rateLph(22000, start), 76.7, 0.1);
});

const demo = () => ({
  cylinders: [{ nr: '1', size: 2, p: 200 }, { nr: '2', size: 2, p: 185 }],
  persons: 2, sfPct: 10, startM: 2800, restBar: 15, climb: 1.5, sink: 2, factor: 1,
  levels: [{ alt: 8000, dur: 2 }, { alt: 12000, dur: 3 }, { alt: 15000, dur: 2 }, { alt: 10000, dur: 1 }],
});

test('Beispielrechnung des Entwurfs', () => {
  const r = compute(demo());
  near(r.usable, 773, 1);
  near(r.content, 838, 1.5);
  near(r.cons, 334.2, 0.5);
  near(r.need, 367.7, 0.6);
  near(r.reserve, 405, 1.5);
  near(r.reservePct, 52.4, 0.3);
  near(r.rangeH, 6.01, 0.03);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.rows.map((x) => x.type), ['level', 'up', 'level', 'up', 'level', 'down', 'level', 'down']);
  near(r.rows[1].cons, 5.8, 0.1); near(r.rows[2].cons, 139.7, 0.1); near(r.rows[5].cons, 10.6, 0.1);
  near(r.rows[7].cons, 1.0, 0.1); near(r.rows[7].rest, 439, 1);
  near(r.durTotal, 8.641, 0.005);
  near(r.durO2, 6.57, 0.02);
  assert.equal(r.warn.mask, false); assert.equal(r.warn.extrapLow, true);
});

test('Skalierung: Personen, Sicherheitsfaktor, Verbrauchsfaktor; Status knapp und ungenügend', () => {
  const a = compute(demo()), b = compute({ ...demo(), persons: 4 }), c = compute({ ...demo(), factor: 1.5 });
  near(b.cons, 2 * a.cons, 1e-6); near(c.cons, 1.5 * a.cons, 1e-6);
  const tight = compute({ ...demo(), cylinders: [{ nr: '1', size: 2, p: 180 }] });   // 359 L nutzbar: deckt 334, nicht 368
  assert.equal(tight.status, 'tight');
  const short = compute({ ...demo(), cylinders: [{ nr: '1', size: 1, p: 200 }] });
  assert.equal(short.status, 'short');
  assert.ok(short.reserve < 0);
});

test('Profil ganz unter der Beginnhöhe braucht keinen Sauerstoff', () => {
  const r = compute({ ...demo(), levels: [{ alt: 6000, dur: 3 }, { alt: 8000, dur: 1 }] });
  assert.equal(r.cons, 0); assert.equal(r.rangeH, null); assert.equal(r.rows.length, 3);
});

test('Über FL180: Maskenkurve und Hinweis', () => {
  const r = compute({ ...demo(), levels: [{ alt: 20000, dur: 1 }] });
  near(r.rows[0].cons, 63.16 * 2, 0.1);
  assert.equal(r.warn.mask, true);
});

test('Nachführen: Vergleich mit Plan und Rest der Fahrt', () => {
  const t = track(demo(), 1, 3, [118, 185]);
  near(t.planned, 145.5, 0.3);
  near(t.planRest, 627.4, 1);
  near(t.actualUsable, 594.6, 1.5);
  near(t.deviation, -33, 1.5);
  near(t.ratio, 1.225, 0.01);
  assert.deepEqual(t.remaining.map((l) => [l.alt, l.dur]), [[12000, 0], [15000, 2], [10000, 1]]);
  near(t.restPlan.cons, 188.7, 0.3);
  near(t.restAdopt.need, 254.4, 1.5);
  near(t.restAdopt.reserve, 340, 2.5);
  // Verweildauer länger als geplant: Rest der Stufe wird nicht negativ
  assert.equal(track(demo(), 1, 5, [100, 185]).remaining[0].dur, 0);
});

test('Einheiten: Höhen, Dauer, Druck', () => {
  assert.equal(altText(12000, 'ft'), 'FL120'); assert.equal(altText(8000, 'ft'), 'FL080'); assert.equal(altText(4500, 'ft'), '4500 ft');
  assert.equal(altText(12000, 'm'), '3658 m');
  assert.equal(parseAlt('FL120', 'ft'), 12000); assert.equal(parseAlt('fl 80', 'ft'), 8000); assert.equal(parseAlt('120', 'ft'), 12000);
  assert.equal(parseAlt('12000', 'ft'), 12000); assert.equal(parseAlt('4500 ft', 'm'), 4500);
  near(parseAlt('2800', 'm'), 9186.4, 0.1); near(parseAlt('2800 m', 'ft'), 9186.4, 0.1);
  assert.ok(Number.isNaN(parseAlt('abc', 'ft')));
  assert.equal(durText(2), '2:00'); assert.equal(durText(0.2258), '0:14'); assert.equal(durText(8.6412), '8:38');
  assert.equal(parseDur('2:30'), 2.5); assert.equal(parseDur('2.5'), 2.5); assert.equal(parseDur('2,5'), 2.5);
  assert.equal(parseDur('90min'), 1.5); assert.equal(parseDur('3'), 3); assert.equal(parseDur('2h15'), 2.25);
  assert.ok(Number.isNaN(parseDur('1:75')));
  assert.equal(pText(200, 'psi'), '2901'); near(pFromUnit(2901, 'psi'), 200, 0.05);
});
