/* EDS O2-Planung — Einheiten: Höhen (m, ft, FL), Dauer (h:mm), Druck (bar, psi). */
import { FT_PER_M, PSI_PER_BAR } from './model.js';

export const FL_FROM_FT = 5000;     // ab dieser Höhe wird in Flugflächen angezeigt

const toNum = (s) => {
  const v = parseFloat(String(s).replace(/[’'\s]/g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};

/** Höhe (ft) als Text in der gewählten Einheit: 'ft' → «FL120» bzw. «4500 ft», 'm' → «3658 m». */
export function altText(ft, unit = 'ft') {
  if (!Number.isFinite(ft)) return '';
  if (unit === 'm') return Math.round(ft / FT_PER_M) + ' m';
  if (ft >= FL_FROM_FT) return 'FL' + String(Math.round(ft / 100)).padStart(3, '0');
  return Math.round(ft) + ' ft';
}

/** Eingabe einer Höhe → ft, oder NaN. Im Modus ft/FL gelten «FL120», «120» (unter 1000 = Flugfläche) und «12000». */
export function parseAlt(text, unit = 'ft') {
  const t = String(text == null ? '' : text).trim().toLowerCase();
  if (!t) return NaN;
  const fl = t.match(/^fl\s*(\d{1,3})$/);
  if (fl) return +fl[1] * 100;
  const v = toNum(t);
  if (!(v >= 0)) return NaN;
  if (/m$/.test(t) && !/ft$/.test(t)) return v * FT_PER_M;
  if (/ft$/.test(t)) return v;
  if (unit === 'm') return v * FT_PER_M;
  return v < 1000 ? v * 100 : v;
}

/** Dauer in Stunden als «h:mm». */
export function durText(h) {
  if (!Number.isFinite(h) || h < 0) return '';
  const m = Math.round(h * 60);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}

/** Eingabe einer Dauer → Stunden, oder NaN: «2:30», «2.5», «150min». */
export function parseDur(text) {
  const t = String(text == null ? '' : text).trim().toLowerCase();
  if (!t) return NaN;
  const hm = t.match(/^(\d{1,3})\s*[:h]\s*(\d{1,2})?$/);
  if (hm) { const m = +(hm[2] || 0); return m < 60 ? +hm[1] + m / 60 : NaN; }
  const mi = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:min|m)$/);
  if (mi) return toNum(mi[1]) / 60;
  const v = toNum(t);
  return v >= 0 ? v : NaN;
}

export const pToUnit = (bar, unit) => (unit === 'psi' ? bar * PSI_PER_BAR : bar);
export const pFromUnit = (v, unit) => (unit === 'psi' ? v / PSI_PER_BAR : v);
export const pText = (bar, unit) => (Number.isFinite(bar) ? String(Math.round(pToUnit(bar, unit))) : '');
export const mToUnit = (m, unit) => (unit === 'm' ? m : m * FT_PER_M);
export const mFromUnit = (v, unit) => (unit === 'm' ? v : v / FT_PER_M);
export { toNum };
