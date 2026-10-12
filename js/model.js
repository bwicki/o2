/* EDS O2-Planung — Rechenmodell (ohne DOM, auch unter Node lauffähig).
 *
 * 1) Zylinderinhalt: Realgas-Sauerstoff über den Kompressibilitätsfaktor Z(p, T),
 *    bezogen auf 1.01325 bar / 21.1 °C (Bezug der Mountain-High-Tabelle).
 * 2) Verbrauch: stückweise linear zwischen den Stützpunkten, die aus dem
 *    «Cylinder Duration Chart» von Mountain High abgeleitet sind (EDS, eine Person).
 * 3) Fahrtprofil: Höhenstufen mit Dauer; Steigen und Sinken dazwischen ergänzt
 *    das Modell und integriert den Verbrauch über die Höhe.
 */

export const FT_PER_M = 3.280839895;
export const PSI_PER_BAR = 14.5037738;

/* ---------- 1) Realgas ---------- */

// Z für Sauerstoff: Zeilen = Temperatur −40 … +60 °C (Schritt 10),
// Spalten = Überdruck 0 … 350 bar (Schritt 10). Quelle: CoolProp (Helmholtz-Zustandsgleichung).
const Z_T0 = -40, Z_DT = 10, Z_P0 = 0, Z_DP = 10;
const Z_TAB = [
    [0.99820,0.98051,0.96294,0.94555,0.92846,0.91176,0.89559,0.88007,0.86534,0.85157,0.83890,0.82749,0.81748,0.80899,0.80211,0.79688,0.79334,0.79145,0.79116,0.79239,0.79503,0.79896,0.80408,0.81025,0.81737,0.82533,0.83402,0.84337,0.85329,0.86370,0.87456,0.88579,0.89737,0.90923,0.92135,0.93370],
    [0.99846,0.98334,0.96841,0.95373,0.93939,0.92547,0.91206,0.89927,0.88720,0.87595,0.86562,0.85632,0.84813,0.84114,0.83540,0.83096,0.82782,0.82599,0.82545,0.82614,0.82801,0.83099,0.83500,0.83995,0.84578,0.85240,0.85974,0.86771,0.87626,0.88533,0.89485,0.90479,0.91509,0.92571,0.93662,0.94779],
    [0.99868,0.98575,0.97305,0.96064,0.94858,0.93694,0.92580,0.91523,0.90529,0.89608,0.88765,0.88008,0.87343,0.86776,0.86309,0.85946,0.85688,0.85536,0.85487,0.85541,0.85692,0.85937,0.86271,0.86688,0.87182,0.87748,0.88380,0.89073,0.89820,0.90618,0.91461,0.92345,0.93267,0.94222,0.95208,0.96221],
    [0.99887,0.98782,0.97702,0.96652,0.95638,0.94665,0.93738,0.92863,0.92045,0.91291,0.90606,0.89993,0.89457,0.89003,0.88632,0.88346,0.88147,0.88035,0.88008,0.88067,0.88207,0.88427,0.88722,0.89090,0.89525,0.90024,0.90583,0.91197,0.91862,0.92574,0.93330,0.94126,0.94958,0.95823,0.96719,0.97643],
    [0.99903,0.98960,0.98043,0.97156,0.96304,0.95491,0.94721,0.93999,0.93328,0.92714,0.92159,0.91667,0.91241,0.90884,0.90597,0.90382,0.90240,0.90170,0.90172,0.90246,0.90389,0.90599,0.90875,0.91213,0.91610,0.92063,0.92570,0.93126,0.93729,0.94376,0.95063,0.95787,0.96546,0.97338,0.98158,0.99007],
    [0.99917,0.99115,0.98338,0.97591,0.96877,0.96200,0.95563,0.94970,0.94423,0.93926,0.93481,0.93092,0.92759,0.92486,0.92273,0.92121,0.92031,0.92002,0.92035,0.92129,0.92282,0.92493,0.92760,0.93081,0.93454,0.93877,0.94347,0.94861,0.95418,0.96014,0.96647,0.97315,0.98015,0.98746,0.99505,1.00290],
    [0.99930,0.99249,0.98594,0.97968,0.97373,0.96813,0.96289,0.95805,0.95363,0.94966,0.94615,0.94313,0.94061,0.93860,0.93711,0.93615,0.93572,0.93583,0.93646,0.93761,0.93928,0.94145,0.94411,0.94724,0.95082,0.95484,0.95928,0.96412,0.96933,0.97491,0.98082,0.98705,0.99358,1.00040,1.00748,1.01480],
    [0.99941,0.99367,0.98818,0.98296,0.97804,0.97344,0.96918,0.96528,0.96176,0.95864,0.95594,0.95367,0.95183,0.95045,0.94952,0.94906,0.94906,0.94952,0.95043,0.95181,0.95363,0.95589,0.95857,0.96167,0.96517,0.96905,0.97331,0.97793,0.98288,0.98816,0.99374,0.99962,1.00577,1.01218,1.01884,1.02573],
    [0.99950,0.99470,0.99013,0.98583,0.98180,0.97807,0.97465,0.97156,0.96882,0.96644,0.96443,0.96280,0.96157,0.96073,0.96029,0.96026,0.96064,0.96142,0.96261,0.96419,0.96616,0.96852,0.97126,0.97436,0.97782,0.98162,0.98575,0.99020,0.99495,1.00000,1.00533,1.01092,1.01676,1.02284,1.02915,1.03568],
    [0.99958,0.99560,0.99185,0.98834,0.98510,0.98212,0.97944,0.97705,0.97499,0.97324,0.97183,0.97077,0.97005,0.96969,0.96968,0.97003,0.97075,0.97182,0.97325,0.97502,0.97715,0.97962,0.98242,0.98554,0.98898,0.99273,0.99677,1.00110,1.00570,1.01057,1.01569,1.02105,1.02664,1.03245,1.03847,1.04469],
    [0.99966,0.99641,0.99337,0.99056,0.98799,0.98568,0.98364,0.98187,0.98039,0.97920,0.97831,0.97773,0.97747,0.97752,0.97789,0.97858,0.97960,0.98093,0.98257,0.98453,0.98680,0.98937,0.99224,0.99540,0.99884,1.00255,1.00654,1.01077,1.01526,1.01998,1.02494,1.03011,1.03549,1.04108,1.04686,1.05282]
];
const P_ATM = 1.01325;          // bar
const T_REF = 294.25;           // 21.1 °C (70 °F), Bezug Mountain High
const Z_REF = 0.99931;

/** Kompressibilitätsfaktor von O2 bei Überdruck pBar (bar) und Temperatur tC (°C). */
export function zO2(pBar, tC = 15) {
  const nT = Z_TAB.length, nP = Z_TAB[0].length;
  const p = Math.min(Math.max(pBar, Z_P0), Z_P0 + Z_DP * (nP - 1));
  const t = Math.min(Math.max(tC, Z_T0), Z_T0 + Z_DT * (nT - 1));
  const i = Math.min(Math.floor((p - Z_P0) / Z_DP), nP - 2);
  const j = Math.min(Math.floor((t - Z_T0) / Z_DT), nT - 2);
  const fp = (p - (Z_P0 + i * Z_DP)) / Z_DP, ft = (t - (Z_T0 + j * Z_DT)) / Z_DT;
  const a = Z_TAB[j][i] * (1 - fp) + Z_TAB[j][i + 1] * fp;
  const b = Z_TAB[j + 1][i] * (1 - fp) + Z_TAB[j + 1][i + 1] * fp;
  return a * (1 - ft) + b * ft;
}

/** Gasinhalt in Litern (bei 1.01325 bar, 21.1 °C) eines Zylinders mit Wasservolumen sizeL bei Überdruck pBar. */
export function contentL(sizeL, pBar, tC = 15) {
  if (!(sizeL > 0) || !(pBar > 0)) return 0;
  const n = (pBar + P_ATM) / (zO2(pBar, tC) * (tC + 273.15));
  const nRef = P_ATM / (Z_REF * T_REF);
  return sizeL * n / nRef;
}

/** Nutzbarer Inhalt bis zum Restdruck restBar. */
export function usableL(sizeL, pBar, restBar = 0, tC = 15) {
  if (!(pBar > restBar)) return 0;
  return Math.max(0, contentL(sizeL, pBar, tC) - contentL(sizeL, Math.max(restBar, 0), tC));
}

/* ---------- 2) Verbrauch ---------- */

// Stützpunkte [Höhe ft, L/h je Person], abgeleitet aus dem Cylinder Duration Chart (Rev. 06/2017):
// Zylinderinhalt ÷ Nutzungsdauer, über alle zwölf Zylinder ausgeglichen.
export const EDS_CANNULA = [[10000, 16.32], [15000, 33.71], [18000, 43.32]];   // Kanüle, Modi N / D5 / D10
export const EDS_MASK = [[20000, 63.16], [25000, 96.92]];                      // Maske, F-Modus
export const MASK_ABOVE_FT = 18000;    // über FL180 verlangt der Hersteller Maske und F-Modus
export const MIN_RATE = 8;             // L/h: Untergrenze unter 10 000 ft (Annahme, keine Herstellerangabe)

// Sauerstoffregel nach AMC1 BOP.BAS.180 (Part-BOP, ED Decision 2018/004/R), wenn der Kommandant die Wirkung des
// Sauerstoffmangels nicht selbst beurteilen kann (BOP.BAS.180, Verordnung (EU) 2018/395): alle Insassen über 13 000 ft
// Druckhöhe durchgehend, die Besatzung zwischen 10 000 und 13 000 ft für jede Dauer über 30 Minuten.
export const RULE_ALWAYS_FT = 13000;
export const RULE_BAND_FT = 10000;
export const RULE_BAND_LIMIT_H = 0.5;

function lin(nodes, h) {
  let a = nodes[0], b = nodes[1];
  if (h >= nodes[nodes.length - 1][0]) { a = nodes[nodes.length - 2]; b = nodes[nodes.length - 1]; }
  else for (let i = 0; i < nodes.length - 1; i++) if (h >= nodes[i][0] && h <= nodes[i + 1][0]) { a = nodes[i]; b = nodes[i + 1]; break; }
  return a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]);
}

/** Verbrauch je Person in L/h auf Höhe altFt; unter startFt wird kein Sauerstoff genommen. */
export function rateLph(altFt, startFt = 0) {
  if (!(altFt >= startFt)) return 0;
  if (altFt > MASK_ABOVE_FT) return Math.max(lin(EDS_MASK, altFt), lin(EDS_CANNULA, MASK_ABOVE_FT));
  return Math.max(lin(EDS_CANNULA, altFt), MIN_RATE);
}

/* ---------- 3) Fahrtprofil ---------- */

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * input: { cylinders:[{nr,size,p}], persons, sfPct, startM, restBar, climb, sink, factor, tempC, trans, levels:[{alt (ft), dur (h)}] }
 * Drücke in bar Überdruck, Grössen in Liter Wasservolumen.
 * trans === false: Die Höhenstufen sind bereits ein vollständiger Verlauf (z. B. aus dem Fahrtbriefing);
 * Steigen, Sinken und der Abstieg am Schluss werden dann nicht ergänzt.
 */
export function compute(input) {
  const persons = Math.max(0, num(input.persons, 1));
  const sf = Math.max(0, num(input.sfPct, 0)) / 100;
  const startFt = Math.max(0, num(input.startM, 0)) * FT_PER_M;
  const rest = Math.max(0, num(input.restBar, 0));
  const climb = Math.max(0.1, num(input.climb, 1.5));
  const sink = Math.max(0.1, num(input.sink, 2));
  const factor = Math.max(0, num(input.factor, 1)) || 1;
  const tC = num(input.tempC, 15);
  const mult = persons * factor;
  const autoTrans = input.trans !== false;

  const cyl = (input.cylinders || []).map((c) => {
    const size = Math.max(0, num(c.size)), p = Math.max(0, num(c.p));
    return { nr: c.nr, size, p, content: contentL(size, p, tC), usable: usableL(size, p, rest, tC), low: p > 0 && p <= rest };
  });
  const content = cyl.reduce((s, c) => s + c.content, 0);
  const usable = cyl.reduce((s, c) => s + c.usable, 0);

  const levels = (input.levels || []).map((l) => ({ alt: Math.max(0, num(l.alt)), dur: Math.max(0, num(l.dur)) }));
  const rows = [];
  let cum = 0, durTotal = 0, durO2 = 0, mask = false, extrapLow = false, extrapHigh = false;
  let above13 = 0, band10 = 0;                                       // Zeit ohne Sauerstoff in den Bereichen der Sauerstoffregel
  const noO2 = (alt, h) => {
    if (alt >= startFt) return;
    if (alt > RULE_ALWAYS_FT) above13 += h; else if (alt > RULE_BAND_FT) band10 += h;
  };
  const flag = (alt) => {
    if (alt < startFt) return;
    if (alt > MASK_ABOVE_FT) mask = true;
    if (alt < EDS_CANNULA[0][0]) extrapLow = true;
    if (alt > EDS_MASK[EDS_MASK.length - 1][0]) extrapHigh = true;
  };
  const push = (r) => {
    cum += r.cons; durTotal += r.dur;
    r.cum = cum; r.rest = usable - cum; r.restPct = usable > 0 ? (usable - cum) / usable * 100 : 0;
    rows.push(r);
  };
  const transition = (from, to, final) => {
    const dur = Math.abs(to - from) / FT_PER_M / (to > from ? climb : sink) / 3600;
    const N = 400; let lph = 0, o2 = 0;
    for (let i = 0; i < N; i++) { const h = from + (to - from) * (i + 0.5) / N; const r = rateLph(h, startFt); lph += r; if (r > 0) o2++; flag(h); noO2(h, dur / N); }
    lph /= N;
    durO2 += dur * o2 / N;
    push({ type: to > from ? 'up' : 'down', from, to, final: !!final, dur, rate: lph, cons: lph * dur * mult });
  };
  levels.forEach((l, i) => {
    if (autoTrans && i > 0 && levels[i - 1].alt !== l.alt) transition(levels[i - 1].alt, l.alt, false);
    const r = rateLph(l.alt, startFt);
    flag(l.alt);
    noO2(l.alt, l.dur);
    if (r > 0) durO2 += l.dur;
    push({ type: 'level', index: i, alt: l.alt, dur: l.dur, rate: r, cons: r * l.dur * mult });
  });
  if (autoTrans && levels.length && levels[levels.length - 1].alt > startFt) transition(levels[levels.length - 1].alt, startFt, true);

  const cons = cum, add = cons * sf, need = cons + add;
  const reserve = usable - need;
  const maxAlt = levels.reduce((m, l) => Math.max(m, l.alt), 0);
  const maxRate = rateLph(maxAlt, startFt) * mult;
  const status = cons <= 0 && usable <= 0 ? 'none' : usable >= need ? 'ok' : usable >= cons ? 'tight' : 'short';

  // Zylinderwechsel: alle Personen atmen aus demselben Zylinder, die Zylinder werden in der erfassten Reihenfolge geleert.
  const timeAtCum = (target) => {                                    // Zeit (h ab Profilbeginn), zu der der Verbrauch «target» erreicht
    let t = 0, c = 0;
    for (const r of rows) {
      if (r.cons > 0 && c + r.cons >= target - 1e-9) return t + r.dur * Math.min(1, Math.max(0, (target - c) / r.cons));
      t += r.dur; c += r.cons;
    }
    return null;
  };
  const inUse = cyl.filter((c) => c.usable > 0);
  const switches = [], cylPlan = [];
  let acc = 0, t0 = 0, emptyAt = null;
  inUse.forEach((c, k) => {
    acc += c.usable;
    const tEnd = cons > acc + 1e-9 ? timeAtCum(acc) : null;           // null: reicht über das Profil hinaus
    const used = Math.min(c.usable, Math.max(0, cons - (acc - c.usable)));
    cylPlan.push({ nr: c.nr, from: used > 0 || k === 0 ? t0 : null, to: tEnd, used, left: c.usable - used });
    if (tEnd != null) {
      if (k < inUse.length - 1) switches.push({ from: c.nr, to: inUse[k + 1].nr, t: tEnd }); else emptyAt = tEnd;
      t0 = tEnd;
    }
  });
  return {
    cyl, content, usable, rows, cons, add, need, reserve,
    reservePct: usable > 0 ? reserve / usable * 100 : 0,
    endRest: usable - cons, endRestPct: usable > 0 ? (usable - cons) / usable * 100 : 0,
    maxAlt, rangeH: maxRate > 0 ? reserve / maxRate : null,
    status, durTotal, durO2, startFt, persons, sfPct: sf * 100, factor,
    switches, cylPlan, emptyAt, autoTrans,
    rule: { above13H: above13, band10H: band10, limitH: RULE_BAND_LIMIT_H, violated: above13 > 1e-6 || band10 > RULE_BAND_LIMIT_H + 1e-6 },
    warn: { mask, extrapLow, extrapHigh, low: cyl.filter((c) => c.low).map((c) => c.nr), noLevels: levels.length === 0 },
  };
}

/**
 * Nachführen im Flug: Stand auf Höhenstufe k nach elapsedH Stunden mit den aktuellen Drücken pNow (bar).
 * Liefert den Vergleich mit dem Plan und die Rechnung für den Rest der Fahrt.
 */
export function track(input, k, elapsedH, pNow) {
  const base = compute(input);
  const levels = input.levels || [];
  k = Math.min(Math.max(0, k | 0), Math.max(0, levels.length - 1));
  const el = Math.max(0, num(elapsedH));
  let planned = 0;
  for (const r of base.rows) {
    if (r.type === 'level' && r.index === k) { planned += r.rate * el * base.persons * base.factor; break; }
    planned += r.cons;
  }
  const rest = Math.max(0, num(input.restBar, 0)), tC = num(input.tempC, 15);
  const cylNow = (input.cylinders || []).map((c, i) => ({ nr: c.nr, size: c.size, p: Math.max(0, num(pNow && pNow[i], c.p)) }));
  const actualUsable = cylNow.reduce((s, c) => s + usableL(num(c.size), c.p, rest, tC), 0);
  const planRest = base.usable - planned;
  const actualCons = base.usable - actualUsable;
  const ratio = planned > 1 ? actualCons / planned : null;            // beobachteter Verbrauch gegenüber Plan
  const newFactor = ratio != null && ratio > 0 ? base.factor * ratio : null;
  const remaining = levels.length ? [{ alt: levels[k].alt, dur: Math.max(0, num(levels[k].dur) - el) }, ...levels.slice(k + 1)] : [];
  const restOf = (f) => compute({ ...input, cylinders: cylNow, levels: remaining, factor: f });
  return {
    base, k, elapsed: el, planned, planRest, actualUsable, actualCons,
    deviation: actualUsable - planRest, ratio, newFactor,
    cylNow, remaining,
    restPlan: restOf(base.factor),
    restAdopt: newFactor ? restOf(newFactor) : null,
  };
}
