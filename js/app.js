/* EDS O2-Planung — Oberfläche: Zustand, Eingaben, Resultat, Nachführen, Link/QR, Druck. */
import { APP } from './version.js';
import { compute, track, FT_PER_M, EDS_CANNULA, EDS_MASK } from './model.js';
import { altText, parseAlt, durText, parseDur, pToUnit, pFromUnit, pText, toNum } from './units.js';
import { t, setLang, getLang, applyStatic } from './i18n.js';
import { newId, prefs, local, remote, encodeSnap, parseHash, KEEP_DAYS } from './store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f0 = (v) => String(Math.round(v)).replace('-', '−');
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const clampNum = (v, def, lo, hi) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; };

const ICON = {
  ok: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>',
  tight: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5"/><path d="M12 17.2v.3"/></svg>',
  short: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7"/><path d="M15.5 8.5l-7 7"/></svg>',
  none: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
  x: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
  check: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  device: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>',
  back: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
};
ICON.statusOf = (s) => ICON[s] || ICON.none;

/* ---------- Zustand ---------- */
const DEFAULTS = () => ({
  v: 1, id: null, rev: 0, updated: null,
  units: { p: 'bar', alt: 'ft' },
  cyl: [{ nr: '1', size: 2, p: 200 }, { nr: '2', size: 2, p: 185 }],
  set: { persons: 2, sf: 10, startM: 2800, startU: 'm', rest: 15, climb: 1.5, sink: 2, factor: 1 },
  prof: [{ alt: 8000, dur: 2 }, { alt: 12000, dur: 3 }, { alt: 15000, dur: 2 }, { alt: 10000, dur: 1 }],
  log: [],
});

function normalize(o) {
  const d = DEFAULTS(), s = (o && o.set) || {};
  o = o || {};
  return {
    v: 1, id: o.id || null, rev: +o.rev || 0, updated: o.updated || null,
    units: { p: o.units && o.units.p === 'psi' ? 'psi' : 'bar', alt: o.units && o.units.alt === 'm' ? 'm' : 'ft' },
    cyl: (Array.isArray(o.cyl) && o.cyl.length ? o.cyl : d.cyl).slice(0, 24).map((c, i) => ({ nr: String(c.nr == null ? i + 1 : c.nr).slice(0, 8), size: clampNum(c.size, 2, 0, 200), p: clampNum(c.p, 0, 0, 400) })),
    set: {
      persons: Math.round(clampNum(s.persons, d.set.persons, 1, 20)), sf: clampNum(s.sf, d.set.sf, 0, 300), startM: clampNum(s.startM, d.set.startM, 0, 12000), startU: s.startU === 'ft' ? 'ft' : 'm',
      rest: clampNum(s.rest, d.set.rest, 0, 300), climb: clampNum(s.climb, d.set.climb, 0.1, 20), sink: clampNum(s.sink, d.set.sink, 0.1, 20), factor: clampNum(s.factor, 1, 0.1, 10),
    },
    prof: (Array.isArray(o.prof) ? o.prof : d.prof).slice(0, 30).map((l) => ({ alt: clampNum(l.alt, 0, 0, 60000), dur: clampNum(l.dur, 0, 0, 200) })),
    log: Array.isArray(o.log) ? o.log.slice(-20) : [],
  };
}

let S = DEFAULTS();
let R = compute(inputOf(S));
const sync = { state: 'demo', time: null, expires: null };       // demo | saving | saved | local
let saveTimer = null;

function inputOf(s) {
  return { cylinders: s.cyl, persons: s.set.persons, sfPct: s.set.sf, startM: s.set.startM, restBar: s.set.rest, climb: s.set.climb, sink: s.set.sink, factor: s.set.factor, levels: s.prof };
}

// Beginnhöhe: eigene Einheit (Vorgabe Meter), unabhängig von der Einheit des Fahrtprofils
const startValue = () => Math.round(S.set.startU === 'm' ? S.set.startM : S.set.startM * FT_PER_M);
const startText = () => startValue() + (S.set.startU === 'm' ? ' m' : ' ft');
const aT = (ft) => altText(ft, S.units.alt);
const locale = () => (getLang() === 'en' ? 'en-GB' : 'de-CH');
const timeText = (iso) => (iso ? new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) : '');
const dateText = (d) => new Date(d).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });

/* ---------- Speichern ---------- */
function touch() {
  if (!S.id) { S.id = newId(); history.replaceState(null, '', '#' + S.id); }
  S.updated = new Date().toISOString();
  S.rev = (S.rev || 0) + 1;
  local.save(S);
  hideNotice();
  scheduleRemote(1500);
  renderResults();
}

function scheduleRemote(delay) {
  clearTimeout(saveTimer);
  if (!remote.configured || !S.id) { sync.state = S.id ? 'local' : 'demo'; sync.time = S.updated; return; }
  sync.state = 'saving';
  saveTimer = setTimeout(async () => {
    const sent = S.updated, res = await remote.put(S);
    if (S.updated !== sent) return;                                  // inzwischen weitergeändert: der nächste Lauf speichert
    if (res && res.updated) { sync.state = 'saved'; sync.time = res.updated; sync.expires = res.expires; } else { sync.state = 'local'; sync.time = S.updated; }
    renderLink();
  }, delay);
}

async function loadFromHash() {
  const { id, snap } = parseHash(location.hash);
  clearTimeout(saveTimer);
  hideNotice();
  if (!id) { S = DEFAULTS(); sync.state = 'demo'; renderAll(); return; }
  let best = local.load(id);
  if (snap && (!best || (snap.updated || '') > (best.updated || ''))) best = { ...snap, id };
  if (best) { S = normalize({ ...best, id }); sync.state = remote.configured ? 'saving' : 'local'; sync.time = S.updated; renderAll(); }
  const rem = await remote.get(id);                                  // undefined = nicht erreichbar, null = unbekannt
  if (parseHash(location.hash).id !== id) return;                    // inzwischen woanders
  if (rem && rem.data && (!best || (rem.data.updated || '') >= (best.updated || ''))) {
    S = normalize({ ...rem.data, id }); local.save(S);
    sync.state = 'saved'; sync.time = rem.updated || S.updated; sync.expires = rem.expires;
  } else if (best) {
    if (!S.updated) S.updated = new Date().toISOString();
    local.save(S);
    if (rem === undefined) { sync.state = 'local'; sync.time = S.updated; } else scheduleRemote(0);
  } else {
    S = DEFAULTS(); S.id = id; sync.state = 'demo';
    showNotice(t('notFound', { id }));
  }
  renderAll();
}

const baseUrl = () => location.href.split('#')[0];
const shortUrl = () => (S.id ? baseUrl() + '#' + S.id : baseUrl());
const shareUrl = () => (S.id && (!remote.configured || sync.state === 'local') ? shortUrl() + '.' + encodeSnap(S) : shortUrl());
const showUrl = () => shortUrl().replace(/^https?:\/\//, '').replace(/^file:\/\/.*\//, 'o2.wicki.aero/');

function showNotice(text) { const n = $('notice'); n.textContent = text; n.hidden = false; }
function hideNotice() { $('notice').hidden = true; }

/* ---------- Eingaben zeichnen ---------- */
function renderInputs() {
  const pu = S.units.p, au = S.units.alt;
  document.querySelectorAll('#pUnitSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.unit === pu)));
  document.querySelectorAll('#altUnitSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.unit === au)));
  $('thCylP').textContent = t('thP', { u: pu });

  $('cylBody').innerHTML = S.cyl.map((c, i) => `
    <tr data-i="${i}">
      <td class="l"><input class="in w-nr" data-f="nr" type="text" autocomplete="off" value="${esc(c.nr)}" aria-label="${esc(t('aCylNr'))}"></td>
      <td><input class="in num w-s" data-f="size" type="text" inputmode="decimal" autocomplete="off" value="${c.size ? c.size.toFixed(1) : ''}" aria-label="${esc(t('aCylSize'))}"></td>
      <td><input class="in num w-s" data-f="p" type="text" inputmode="decimal" autocomplete="off" value="${c.p ? pText(c.p, pu) : ''}" aria-label="${esc(t('aCylP', { u: pu }))}"></td>
      <td class="dim hide-phone" data-c="content"></td>
      <td class="strong" data-c="usable"></td>
      <td class="del"><button type="button" class="del-btn" data-act="del" aria-label="${esc(t('aCylDel', { nr: c.nr }))}" ${S.cyl.length < 2 ? 'disabled' : ''}>${ICON.x}</button></td>
    </tr>`).join('') + `
    <tr class="add-row"><td colspan="6"><button type="button" class="btn soft" id="addCyl">${esc(t('addCyl'))}</button></td></tr>
    <tr class="sum"><td class="l" colspan="3">${esc(t('sum'))}</td><td class="hide-phone" id="sumContent"></td><td class="strong" id="sumUsable"></td><td></td></tr>`;

  const set = S.set;
  $('setPersons').value = set.persons;
  $('setSf').value = String(set.sf);
  $('setStart').value = String(startValue());
  $('setRest').value = pText(set.rest, pu);
  $('setClimb').value = set.climb.toFixed(1);
  $('setSink').value = set.sink.toFixed(1);
  $('lblStart').innerHTML = t('fStart_html', { u: set.startU });
  $('lblRest').textContent = t('fRest', { u: pu });
  document.querySelectorAll('#bodySet .in').forEach((el) => el.classList.remove('bad'));

  $('profBody').innerHTML = S.prof.map((l, i) => `
    <tr data-i="${i}">
      <td class="l dim">${i + 1}</td>
      <td><input class="in num w-alt" data-f="alt" type="text" autocomplete="off" value="${esc(aT(l.alt))}" aria-label="${esc(t('aLvlAlt', { n: i + 1 }))}"></td>
      <td><input class="in num w-dur" data-f="dur" type="text" autocomplete="off" value="${durText(l.dur)}" aria-label="${esc(t('aLvlDur', { n: i + 1 }))}"></td>
      <td class="del"><button type="button" class="del-btn" data-act="del" aria-label="${esc(t('aLvlDel', { n: i + 1 }))}">${ICON.x}</button></td>
    </tr>`).join('') + `
    <tr class="add-row"><td colspan="4"><button type="button" class="btn soft" id="addLvl">${esc(t('addLevel'))}</button></td></tr>`;
}

/* ---------- Resultat zeichnen ---------- */
function renderResults() {
  R = compute(inputOf(S));
  const n = S.set.persons;

  // Vorrat: gerechnete Spalten
  document.querySelectorAll('#cylBody tr[data-i]').forEach((tr) => {
    const c = R.cyl[+tr.dataset.i]; if (!c) return;
    tr.querySelector('[data-c="content"]').textContent = f0(c.content);
    tr.querySelector('[data-c="usable"]').textContent = f0(c.usable);
  });
  if ($('sumContent')) { $('sumContent').textContent = f0(R.content); $('sumUsable').textContent = f0(R.usable); }
  $('cylHint').textContent = t('usableHint', { p: pText(S.set.rest, S.units.p), u: S.units.p });

  // Einstellungen: Faktor aus dem Nachführen
  const fl = $('factorLine');
  if (Math.abs(S.set.factor - 1) > 0.004) { fl.hidden = false; fl.innerHTML = `${esc(t('factorLine', { f: S.set.factor.toFixed(2) }))} <button type="button" id="factorReset">${esc(t('factorReset'))}</button>`; } else fl.hidden = true;

  // Zusammenfassungen (eingeklappte Abschnitte auf dem Handy)
  $('setSum').textContent = t(n === 1 ? 'setSum1' : 'setSum', { n, sf: S.set.sf, start: startText() });
  $('profSum').textContent = !S.prof.length ? t('profSum0') : t(S.prof.length === 1 ? 'profSum1' : 'profSum', { n: S.prof.length, dur: durText(R.durTotal), alt: aT(R.maxAlt) });
  $('rowsSum').textContent = t('rowsSum', { cons: f0(R.cons), need: f0(R.need) });

  renderBalance();
  renderWarns();
  $('chart').innerHTML = chartSvg();
  renderRows();
  renderBottom();
  renderLink();
}

function statusDetail() {
  if (R.cons <= 0 && S.prof.length) return t('stNoO2', { start: startText() });
  return t('stDetail', { dur: durText(R.durTotal), o2: durText(R.durO2) });
}
const statusTitle = (s) => t({ ok: 'stOk', tight: 'stTight', short: 'stShort', none: 'stNone' }[s] || 'stNone');
const rangeSub = () => t(S.set.persons === 1 ? 'sRange1' : 'sRange', { alt: aT(R.maxAlt), n: S.set.persons });

function renderBalance() {
  const neg = R.reserve < 0;
  $('balance').innerHTML = `
    <div class="status ${R.status}">${ICON.statusOf(R.status)}<div><div class="t">${esc(statusTitle(R.status))}</div><div class="d">${esc(statusDetail())}</div></div></div>
    <div class="stat"><div class="k">${esc(t('kUsable'))}</div><div class="v">${f0(R.usable)} L</div><div class="s">${esc(t('sCyl', { n: S.cyl.length }))}</div></div>
    <div class="stat"><div class="k">${esc(t('kNeed', { sf: S.set.sf }))}</div><div class="v">${f0(R.need)} L</div><div class="s">${f0(R.cons)} L + ${f0(R.add)} L</div></div>
    <div class="stat ${neg ? 'neg' : ''}"><div class="k">${esc(t(neg ? 'kMissing' : 'kReserve'))}</div><div class="v">${f0(Math.abs(R.reserve))} L</div><div class="s">${esc(neg ? t('sMissing') : t('sReserve', { pct: f0(R.reservePct) }))}</div></div>
    <div class="stat"><div class="k">${esc(t('kRange'))}</div><div class="v">${R.rangeH != null && R.rangeH > 0 ? durText(R.rangeH) + ' h' : '–'}</div><div class="s">${R.rangeH != null ? esc(rangeSub()) : '&nbsp;'}</div></div>`;
}

function renderWarns() {
  const w = [];
  if (R.warn.mask) w.push(t('wMask'));
  if (R.warn.extrapHigh) w.push(t('wHigh'));
  R.warn.low.forEach((nr) => w.push(t('wLow', { nr })));
  $('warns').innerHTML = w.map((x) => `<div class="w">${ICON.tight}<span>${esc(x)}</span></div>`).join('');
  $('warns').hidden = !w.length;
}

const rowName = (r) => {
  if (r.type === 'level') return aT(r.alt);
  return `${t(r.type === 'up' ? 'up' : 'down')} ${aT(r.from)} – ${r.final ? startText() : aT(r.to)}`;
};
const rateCell = (r) => (r.rate > 0 ? (r.type === 'level' ? '' : 'Ø ') + f1(r.rate) : '–');

function renderRows() {
  const n = S.set.persons;
  $('hRows').textContent = t(n === 1 ? 'rowsTitle1' : 'rowsTitle', { n });
  $('rowsTable').innerHTML = `
    <thead><tr><th class="l">${esc(t('thLevel'))}</th><th>${esc(t('thDurS'))}</th><th class="hide-phone">${esc(t('thRate'))}</th><th><span class="w-desk">${esc(t('thCons'))}</span><span class="w-phone">${esc(t('thConsP'))}</span></th><th>${esc(t('thRest'))}</th><th class="hide-phone">${esc(t('thRestPct'))}</th></tr></thead>
    <tbody>${R.rows.map((r) => `
      <tr class="${r.type === 'level' ? 'lvl' : 'auto'}"><td class="l">${esc(rowName(r))}</td><td>${durText(r.dur)}</td><td class="hide-phone">${rateCell(r)}</td><td class="b">${f1(r.cons)}</td><td>${f0(r.rest)}</td><td class="hide-phone">${f0(r.restPct)}</td></tr>`).join('')}
      <tr class="tot"><td class="l">${esc(t('total'))}</td><td>${durText(R.durTotal)}</td><td class="hide-phone"></td><td>${f0(R.cons)}</td><td>${f0(R.endRest)}</td><td class="hide-phone">${f0(R.endRestPct)}</td></tr>
      <tr class="add"><td class="l">${esc(t('addRow', { sf: S.set.sf }))}</td><td></td><td class="hide-phone"></td><td>${f0(R.add)}</td><td>${f0(R.reserve)}</td><td class="hide-phone">${f0(R.reservePct)}</td></tr>
    </tbody>`;
  $('rowsHint').textContent = t('rowsHint', { c: S.set.climb.toFixed(1), s: S.set.sink.toFixed(1), start: startText() });
}

function renderBottom() {
  const bb = $('bottombar');
  bb.className = 'bottombar ' + R.status;
  const d = R.reserve < 0 ? t('bbMissing', { l: f0(-R.reserve) })
    : R.rangeH != null && R.rangeH > 0 ? t('bbReserve', { l: f0(R.reserve), pct: f0(R.reservePct), range: durText(R.rangeH) }) : t('bbReserveNoRange', { l: f0(R.reserve), pct: f0(R.reservePct) });
  bb.innerHTML = `${ICON.statusOf(R.status).replace('<svg ', '<svg class="ic" ')}<div class="bb"><div class="t">${esc(statusTitle(R.status))}</div><div class="d">${esc(d)}</div></div>
    <button type="button" class="btn" id="trackBtn2">${esc(t('trackShort'))}</button>`;
}

function renderLink() {
  $('shareUrl').value = showUrl();
  const st = $('saveStatus');
  let txt, cls, icon;
  if (!S.id || sync.state === 'demo') { txt = t('stDemo'); cls = ''; icon = ''; }
  else if (sync.state === 'saved') { txt = t('stSaved', { time: timeText(sync.time), date: dateText(sync.expires || Date.parse(sync.time) + KEEP_DAYS * 864e5) }); cls = 'ok'; icon = ICON.check; }
  else if (sync.state === 'saving') { txt = t('stSaving'); cls = ''; icon = ''; }
  else { txt = t('stLocal', { time: timeText(sync.time || S.updated) }); cls = 'local'; icon = ICON.device; }
  st.className = 'lb-status ' + cls;
  st.innerHTML = `${icon}<span class="txt">${esc(txt)}</span>`;
  st.title = txt;
  $('qrBtn').innerHTML = qrSvg(shareUrl());
}

function renderAll() {
  applyStatic();
  document.querySelectorAll('#langSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  $('versionStamp').textContent = 'v' + APP.version;
  $('footVersion').innerHTML = `${t('title_html')} v${APP.version} · © Balthasar Wicki`;
  renderInputs();
  renderResults();
}

/* ---------- Verlaufsgrafik ---------- */
function niceMid(v) {
  if (!(v > 0)) return 0;
  const target = v / 2, k = Math.pow(10, Math.floor(Math.log10(target)));
  return [1, 2, 2.5, 5, 10].map((m) => m * k).reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
}

function chartSvg() {
  const rows = R.rows;
  if (!rows.length) return `<svg viewBox="0 0 640 60" role="img" aria-label="${esc(t('chartNo'))}"><text class="empty" x="320" y="34" text-anchor="middle">${esc(t('chartNo'))}</text></svg>`;
  const X0 = 56, X1 = 616, W = X1 - X0, T = R.durTotal > 0 ? R.durTotal : 1;
  const x = (h) => X0 + (h / T) * W;
  const au = S.units.alt;
  let o = '';

  // --- Höhenprofil (y 14 … 94)
  const aTop = Math.max(R.maxAlt, R.startFt, 3000) * 1.08;
  const y = (a) => 94 - (a / aTop) * 80;
  let step = au === 'm' ? 1000 * FT_PER_M : 5000;
  while (aTop / step > 5.5) step *= 2;
  o += `<line class="ax" x1="${X0}" y1="94" x2="${X1}" y2="94"/>`;
  for (let g = step; g < aTop; g += step) {
    o += `<line class="gr" x1="${X0}" y1="${y(g).toFixed(1)}" x2="${X1}" y2="${y(g).toFixed(1)}"/><text class="tx" x="48" y="${(y(g) + 4).toFixed(1)}" text-anchor="end">${esc(aT(Math.round(g)))}</text>`;
  }
  const pts = []; let tt = 0;
  rows.forEach((r, i) => {
    if (i === 0) pts.push([0, r.type === 'level' ? r.alt : r.from]);
    tt += r.dur;
    pts.push([tt, r.type === 'level' ? r.alt : r.to]);
  });
  const yAt = (px) => {                                               // Höhe der Profillinie an der Stelle px
    for (let i = 0; i < pts.length - 1; i++) {
      const xa = x(pts[i][0]), xb = x(pts[i + 1][0]);
      if (px >= xa && px <= xb) return xb > xa ? y(pts[i][1]) + (y(pts[i + 1][1]) - y(pts[i][1])) * (px - xa) / (xb - xa) : y(pts[i][1]);
    }
    return y(pts[pts.length - 1][1]);
  };
  const ys = y(R.startFt), startLabel = t('chartStart', { start: startText() }), lw = startLabel.length * 6.1;
  const free = (xa, ya, yb) => { for (let k = 0; k <= 12; k++) { const yy = yAt(xa + (lw * k) / 12); if (yy > ya - 2 && yy < yb + 2) return false; } return true; };
  if (R.startFt > 0 && ys > 14) {
    o += `<line class="start" x1="${X0}" y1="${ys.toFixed(1)}" x2="${X1}" y2="${ys.toFixed(1)}"/>`;
    const cands = [[X0 + 4, ys + 3, ys + 14, ys + 12], [X0 + 4, ys - 13, ys - 2, ys - 4], [X1 - 4 - lw, ys + 3, ys + 14, ys + 12], [X1 - 4 - lw, ys - 13, ys - 2, ys - 4]];
    const c = cands.find((q) => q[1] > 8 && q[2] < 94 && free(q[0], q[1], q[2])) || cands[0];
    o += `<text class="startt" x="${c[0].toFixed(1)}" y="${c[3].toFixed(1)}">${esc(startLabel)}</text>`;
  }
  o += `<polyline class="alt" points="${pts.map((p) => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ')}"/>`;
  tt = 0;
  rows.forEach((r) => {
    if (r.type === 'level' && x(tt + r.dur) - x(tt) >= 40) {
      const yl = y(r.alt);
      const nearStart = R.startFt > 0 && r.alt < R.startFt && yl - ys < 16;
      const ly = nearStart || yl - 5 < 11 ? yl + 13 : yl - 5;
      o += `<text class="lv" x="${((x(tt) + x(tt + r.dur)) / 2).toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${esc(aT(r.alt))}</text>`;
    }
    tt += r.dur;
  });

  // --- Restvorrat (y 124 … 224)
  const vTop = Math.max(R.usable, 1), vMin = Math.min(0, R.endRest), span = vTop - vMin;
  const yv = (v) => 124 + ((vTop - v) / span) * 100;
  const y0 = yv(0);
  o += `<line class="gr" x1="${X0}" y1="124" x2="${X1}" y2="124"/><text class="tx" x="48" y="128" text-anchor="end">${f0(R.usable)} L</text>`;
  const mid = niceMid(R.usable);
  if (mid > 0 && yv(mid) - 124 > 14 && y0 - yv(mid) > 14) o += `<line class="gr" x1="${X0}" y1="${yv(mid).toFixed(1)}" x2="${X1}" y2="${yv(mid).toFixed(1)}"/><text class="tx" x="48" y="${(yv(mid) + 4).toFixed(1)}" text-anchor="end">${f0(mid)} L</text>`;
  o += `<line class="ax" x1="${X0}" y1="${y0.toFixed(1)}" x2="${X1}" y2="${y0.toFixed(1)}"/><text class="tx" x="48" y="${(y0 + 4).toFixed(1)}" text-anchor="end">${esc(t('chartEmptyAxis'))}</text>`;
  const op = [[0, R.usable]]; tt = 0;
  rows.forEach((r) => { tt += r.dur; op.push([tt, r.rest]); });
  const line = (clampLo, clampHi) => op.map((p) => x(p[0]).toFixed(1) + ',' + yv(Math.min(clampHi, Math.max(clampLo, p[1]))).toFixed(1)).join(' ');
  o += `<polygon class="o2a" points="${line(0, Infinity)} ${X1},${y0.toFixed(1)} ${X0},${y0.toFixed(1)}"/>`;
  if (vMin < 0) o += `<polygon class="o2neg" points="${line(-Infinity, 0)} ${X1},${y0.toFixed(1)} ${X0},${y0.toFixed(1)}"/>`;
  o += `<polyline class="o2" points="${line(-Infinity, Infinity)}"/>`;
  const ye = yv(R.endRest);
  o += `<circle class="dot" cx="${X1}" cy="${ye.toFixed(1)}" r="3.5"/>`;
  const ey = ye + 20 < Math.max(y0, 224) - 3 ? ye + 20 : ye - 9;
  o += `<text class="end" x="${X1 - 4}" y="${ey.toFixed(1)}" text-anchor="end">${esc(t('chartEnd', { l: f0(R.endRest), pct: f0(R.endRestPct) }))}</text>`;

  // --- Zeitachse
  const ts = [0.25, 0.5, 1, 2, 3, 4, 6, 12, 24, 48].find((s) => T / s <= 7) || 48;
  for (let h = 0; h < T - 1e-9; h += ts) {
    if (X1 - x(h) < 42 && h > 0) break;
    o += `<text class="tx" x="${x(h).toFixed(1)}" y="244" text-anchor="middle">${ts < 1 ? durText(h) : h + ' h'}</text>`;
  }
  o += `<text class="tx" x="${X1}" y="244" text-anchor="end">${durText(R.durTotal)}</text>`;
  return `<svg viewBox="0 0 640 252" role="img" aria-label="${esc(t('chartAria', { l: f0(R.endRest) }))}">${o}</svg>`;
}

/* ---------- QR ---------- */
function qrSvg(text) {
  try {
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!q.isDark(r, c)) continue;
      let e = c; while (e + 1 < n && q.isDark(r, e + 1)) e++;
      d += `M${c} ${r}h${e - c + 1}v1h-${e - c + 1}z`; c = e;
    }
    return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" role="img" aria-label="${esc(t('qrAria'))}"><path fill="#111111" d="${d}"/></svg>`;
  } catch { return ''; }
}

/* ---------- Dialoge ---------- */
function openDialog(dlg) { if (!dlg.open) dlg.showModal(); }
function wireClose(dlg) { dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close())); }
const closeBtn = () => `<button type="button" class="icon-btn" data-close aria-label="${esc(t('close'))}">${ICON.x}</button>`;

function showLegend() {
  const dlg = $('dlgLegend');
  const node = (n, how) => `<tr><td>${n[0].toLocaleString('de-CH').replace(/[’']/g, ' ')} ft</td><td>${esc(t(how))}</td><td class="r">${n[1].toFixed(1)}</td></tr>`;
  dlg.innerHTML = `<div class="dlg">
    <div class="dlg-head"><div><h2 id="lgTitle">${esc(t('lgTitle'))}</h2><div class="sub">${t('title_html')} v${APP.version} · ${dateText(APP.date)}</div></div>${closeBtn()}</div>
    <div><h3>${esc(t('lgSrcH'))}</h3><p>${t('lgSrc_html')}</p></div>
    <div><h3>${esc(t('lgNodesH'))}</h3><table class="nodes"><thead><tr><th>${esc(t('lgAlt'))}</th><th>${esc(t('lgDel'))}</th><th class="r">${esc(t('lgRate'))}</th></tr></thead>
      <tbody>${EDS_CANNULA.map((n) => node(n, 'cannula')).join('')}${EDS_MASK.map((n) => node(n, 'mask')).join('')}</tbody></table></div>
    <div><h3>${esc(t('lgCalcH'))}</h3><ul>${t('lgCalc').map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
    <div><h3>${esc(t('lgInputH'))}</h3><p>${esc(t('lgInput'))}</p></div>
    <div><h3>${esc(t('lgSignsH'))}</h3><div class="signs">
      <div class="ok">${ICON.ok}<span><strong>${esc(t('stOk'))}</strong>: ${esc(t('sgOk'))}</span></div>
      <div class="tight">${ICON.tight}<span><strong>${esc(t('stTight'))}</strong>: ${esc(t('sgTight'))}</span></div>
      <div class="short">${ICON.short}<span><strong>${esc(t('stShort'))}</strong>: ${esc(t('sgShort'))}</span></div>
    </div></div>
    <p class="fine">${esc(t('lgFine'))}</p></div>`;
  wireClose(dlg); openDialog(dlg);
}

function showQr() {
  const dlg = $('dlgQr'), url = shareUrl();
  dlg.innerHTML = `<div class="dlg" style="width:360px">
    <div class="dlg-head"><h2 id="qrTitle">${esc(t('myCalc'))}</h2>${closeBtn()}</div>
    <div class="qr-big">${qrSvg(url)}</div>
    <div class="qr-url">${esc(showUrl())}</div>
    <div class="dlg-actions"><button type="button" class="primary-btn big grow" id="qrCopy">${esc(t('copyLink'))}</button></div></div>`;
  wireClose(dlg);
  dlg.querySelector('#qrCopy').addEventListener('click', (e) => copyLink(e.currentTarget));
  openDialog(dlg);
}

function confirmDlg(text, yes) {
  return new Promise((res) => {
    const dlg = $('dlgConfirm');
    dlg.innerHTML = `<div class="dlg" style="width:400px"><p>${esc(text)}</p>
      <div class="dlg-actions"><button type="button" class="btn big" data-v="0">${esc(t('cancel'))}</button><button type="button" class="primary-btn big grow" data-v="1">${esc(yes)}</button></div></div>`;
    let done = false;
    const fin = (v) => { if (done) return; done = true; dlg.close(); res(v); };
    dlg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => fin(b.dataset.v === '1')));
    dlg.addEventListener('close', () => fin(false), { once: true });
    openDialog(dlg);
  });
}

async function copyLink(btn) {
  const url = shareUrl();
  try { await navigator.clipboard.writeText(url); } catch { const i = $('shareUrl'); i.value = url; i.select(); try { document.execCommand('copy'); } catch { /* bleibt markiert */ } i.value = showUrl(); }
  if (btn) { const old = btn.textContent; btn.textContent = t('copied'); setTimeout(() => { btn.textContent = old; }, 1500); }
}

/* ---------- Nachführen ---------- */
function showTrack() {
  if (!S.prof.length || !S.cyl.length) return;
  const dlg = $('dlgTrack'), pu = S.units.p;
  const st = { k: 0, el: 0, p: S.cyl.map((c) => c.p) };
  dlg.innerHTML = `<div class="dlg track">
    <div class="dlg-head">
      <div style="display:flex;gap:10px;align-items:center"><button type="button" class="icon-btn" data-close aria-label="${esc(t('aBack'))}">${ICON.back}</button>
        <div><div class="sub" style="letter-spacing:.14em;text-transform:uppercase;font-size:10px">${esc(S.id ? t('trCalc', { id: S.id }) : t('trCalcNew'))}</div><h2 id="trTitle">${esc(t('trTitle'))}</h2></div></div>
    </div>
    <div class="card"><h3>${esc(t('trWhere'))}</h3>
      <div class="two">
        <div class="field"><label for="trElapsed">${esc(t('trElapsed'))}</label><input class="in" id="trElapsed" type="text" autocomplete="off" value="0:00"></div>
        <div class="field"><label for="trLevel">${esc(t('trLevel'))}</label><select class="in" id="trLevel">${S.prof.map((l, i) => `<option value="${i}">${i + 1} · ${esc(aT(l.alt))}</option>`).join('')}</select></div>
      </div>
      <p class="hint" id="trPlan"></p></div>
    <div class="card"><h3>${esc(t('trPNow'))}</h3>
      <table class="grid"><thead><tr><th class="l">${esc(t('trCyl'))}</th><th>${esc(t('trAtStart'))}</th><th>${esc(t('trNow', { u: pu }))}</th><th>${esc(t('thUsable'))}</th></tr></thead>
      <tbody>${S.cyl.map((c, i) => `<tr><td class="l">${esc(c.nr)} · ${c.size.toFixed(1)} L</td><td class="dim">${pText(c.p, pu)}</td>
        <td><input class="in num now" data-i="${i}" type="text" inputmode="decimal" autocomplete="off" value="${pText(c.p, pu)}" aria-label="${esc(t('aTrP', { nr: c.nr, u: pu }))}"></td><td class="strong" data-u="${i}"></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>${esc(t('trCompare'))}</h3>
      <div class="cmp"><div><div class="k">${esc(t('trIst'))}</div><div class="v" id="trIst"></div></div><div><div class="k">${esc(t('trPlanRest'))}</div><div class="v dim" id="trPlanRest"></div></div><div><div class="k">${esc(t('trDev'))}</div><div class="v dev" id="trDev"></div></div></div>
      <p class="hint" id="trUsed" style="font-size:12px;color:var(--text)"></p>
      <label class="check" id="trAdoptWrap"><input type="checkbox" id="trAdopt" checked><span id="trAdoptTxt"></span></label></div>
    <div class="status" id="trStatus"></div>
    <div class="dlg-actions"><button type="button" class="btn big" data-close>${esc(t('cancel'))}</button><button type="button" class="primary-btn big grow" id="trApply">${esc(t('trApply'))}</button></div>
  </div>`;
  let tr = null;
  const upd = () => {
    tr = track(inputOf(S), st.k, st.el, st.p);
    const lvl = S.prof[st.k], next = S.prof[st.k + 1];
    $('trPlan').textContent = t('trPlan', { n: st.k + 1, alt: aT(lvl.alt), dur: durText(lvl.dur) })
      + (next ? t(next.alt >= lvl.alt ? 'trNextUp' : 'trNextDown', { alt: aT(next.alt) }) : t('trNextEnd'));
    tr.cylNow.forEach((c, i) => { dlg.querySelector(`[data-u="${i}"]`).textContent = f0(tr.restPlan.cyl[i].usable); });
    dlg.querySelectorAll('.now').forEach((el) => el.classList.toggle('changed', Math.abs(st.p[+el.dataset.i] - S.cyl[+el.dataset.i].p) > 0.5));
    $('trIst').textContent = f0(tr.actualUsable) + ' L';
    $('trPlanRest').textContent = f0(tr.planRest) + ' L';
    $('trDev').textContent = (tr.deviation > 0.5 ? '+' : '') + f0(tr.deviation) + ' L';
    const hasF = tr.newFactor != null;
    $('trUsed').textContent = hasF ? t('trUsed', { a: f0(tr.actualCons), p: f0(tr.planned), f: tr.ratio.toFixed(2) }) : t('trNoPlan');
    $('trAdoptWrap').hidden = !hasF;
    $('trAdoptTxt').textContent = hasF ? t('trAdopt', { f: tr.newFactor.toFixed(2) }) : '';
    const rr = hasF && $('trAdopt').checked ? tr.restAdopt : tr.restPlan;
    const box = $('trStatus'); box.className = 'status ' + rr.status;
    const v = { dur: durText(rr.durTotal), need: f0(rr.need), sf: S.set.sf, res: f0(rr.reserve), pct: f0(rr.reservePct), l: f0(-rr.reserve) };
    box.innerHTML = `${ICON.statusOf(rr.status)}<div><div class="t">${esc(statusTitle(rr.status))}</div><div class="d">${esc(t(rr.reserve < 0 ? 'trRestShort' : 'trRest', v))}</div></div>`;
  };
  $('trLevel').addEventListener('change', (e) => { st.k = +e.target.value; upd(); });
  $('trElapsed').addEventListener('input', (e) => { const v = parseDur(e.target.value); e.target.classList.toggle('bad', Number.isNaN(v)); if (!Number.isNaN(v)) { st.el = v; upd(); } });
  $('trElapsed').addEventListener('change', (e) => { if (!Number.isNaN(parseDur(e.target.value))) e.target.value = durText(st.el); });
  dlg.querySelectorAll('.now').forEach((el) => el.addEventListener('input', () => {
    const v = toNum(el.value); el.classList.toggle('bad', !(v >= 0));
    if (v >= 0) { st.p[+el.dataset.i] = pFromUnit(v, pu); upd(); }
  }));
  $('trAdopt').addEventListener('change', upd);
  $('trApply').addEventListener('click', () => {
    const adopt = tr.newFactor != null && $('trAdopt').checked;
    S.cyl.forEach((c, i) => { c.p = st.p[i]; });
    S.log.push({ t: new Date().toISOString(), lvl: st.k + 1, alt: Math.round(S.prof[st.k].alt), el: Math.round(st.el * 1000) / 1000, p: st.p.map((v) => Math.round(v)), f: adopt ? +tr.newFactor.toFixed(3) : S.set.factor });
    S.log = S.log.slice(-20);
    S.prof = tr.remaining.map((l) => ({ alt: l.alt, dur: l.dur }));
    if (adopt) S.set.factor = +tr.newFactor.toFixed(3);
    dlg.close(); touch(); renderInputs();
  });
  wireClose(dlg); upd(); openDialog(dlg);
}

/* ---------- Druck: A5 links auf A4 quer ---------- */
function buildPrintSheet() {
  const pu = S.units.p, n = S.set.persons, sheet = $('printSheet');
  const cylRows = (list) => `<table><thead><tr><th class="l">${esc(t('thNr'))}</th><th>L</th><th>${pu}</th><th>${esc(t('thUsable'))}</th></tr></thead><tbody>
    ${list.map((c) => `<tr><td class="l">${esc(c.nr)}</td><td>${c.size.toFixed(1)}</td><td>${pText(c.p, pu)}</td><td>${f0(c.usable)}</td></tr>`).join('')}</tbody></table>`;
  const many = R.cyl.length > 4, half = Math.ceil(R.cyl.length / 2);
  const sumRow = `<table><tbody><tr class="tot"><td class="l">${esc(t('sum'))}</td><td>${f0(R.usable)}</td></tr></tbody></table>`;
  const setPairs = [[t('pPersons'), n], [t('pSf'), S.set.sf + ' %'], [t('pStart_html'), esc(startText())], [t('pRest'), pText(S.set.rest, pu) + ' ' + pu], [t('pClimbSink'), `${S.set.climb.toFixed(1)} / ${S.set.sink.toFixed(1)} m/s`]];
  if (Math.abs(S.set.factor - 1) > 0.004) setPairs.push([t('pFactor'), S.set.factor.toFixed(2)]);
  const supply = many
    ? `<div><div class="h">${esc(t('supply'))}</div><div class="cyl-cols">${cylRows(R.cyl.slice(0, half))}${cylRows(R.cyl.slice(half))}</div>${sumRow}</div>
       <div><div class="h">${esc(t('settings'))}</div><div class="p-setline">${setPairs.map((p) => `${p[0]} ${p[1]}`).join(' · ')}</div></div>`
    : `<div class="p-two"><div class="grow"><div class="h">${esc(t('supply'))}</div>${cylRows(R.cyl)}${sumRow}</div>
       <div class="p-set"><div class="h">${esc(t('settings'))}</div><div class="kv">${setPairs.map((p) => `<span>${p[0]}</span><span>${p[1]}</span>`).join('')}</div></div></div>`;
  const noteCyl = R.cyl.length <= 5 ? R.cyl.map((c) => `<th>${esc(t('pCylNow', { nr: c.nr, u: pu }))}</th>`).join('') : `<th>${esc(t('trPNow'))}</th>`;
  const noteCells = '<td></td>'.repeat(2 + (R.cyl.length <= 5 ? R.cyl.length : 1));
  const neg = R.reserve < 0;
  sheet.innerHTML = `
    <div class="crop top"></div><div class="crop bottom"></div><div class="crop-label">${esc(t('pCut'))}</div>
    <div class="a5" id="printA5">
      <div class="p-head">
        <div><div class="p-title">${t('title_html')}</div><div>${esc(t('eyebrow') + t('eyebrowDev'))}</div>
          <div class="p-link">${S.id ? esc(showUrl()) : '–'}</div><div class="dim">${esc(t('pPrinted', { dt: dateText(Date.now()) + ' ' + timeText(new Date().toISOString()) }))} · v${APP.version}</div></div>
        <div class="p-brand">${qrSvg(shareUrl())}<img src="img/wicki-logo.png" alt="Wicki Partners Ballonteam"></div>
      </div>
      <div class="p-bal">
        <div><div class="k">${esc(t('pUsable'))}</div><div class="v">${f0(R.usable)} L</div></div>
        <div><div class="k">${esc(t('pNeed', { sf: S.set.sf }))}</div><div class="v">${f0(R.need)} L</div></div>
        <div><div class="k">${esc(t(neg ? 'pMissing' : 'pReserve'))}</div><div class="v">${f0(Math.abs(R.reserve))} L</div></div>
        <div><div class="k">${esc(t('pRange', { alt: aT(R.maxAlt) }))}</div><div class="v">${R.rangeH != null && R.rangeH > 0 ? durText(R.rangeH) + ' h' : '–'}</div></div>
        <div class="p-status">${ICON.statusOf(R.status)}${esc(statusTitle(R.status))}${neg ? '' : esc(t('pStatusRes', { pct: f0(R.reservePct) }))}</div>
      </div>
      ${supply}
      <div><div class="h">${esc(t(n === 1 ? 'rowsTitle1' : 'rowsTitle', { n }))}</div>
        <table><thead><tr><th class="l">${esc(t('thLevel'))}</th><th>${esc(t('thDurS'))}</th><th>${esc(t('thRateP'))}</th><th>${esc(t('thConsP'))}</th><th>${esc(t('thRest'))}</th><th>${esc(t('thRestPctP'))}</th></tr></thead><tbody>
        ${R.rows.map((r) => `<tr class="${r.type === 'level' ? 'lvl' : 'auto'}"><td class="l">${esc(r.type === 'level' ? aT(r.alt) : `${t(r.type === 'up' ? 'up' : 'down')} – ${r.final ? startText() : aT(r.to)}`)}</td><td>${durText(r.dur)}</td><td>${rateCell(r)}</td><td>${f1(r.cons)}</td><td>${f0(r.rest)}</td><td>${f0(r.restPct)}</td></tr>`).join('')}
        <tr class="tot"><td class="l">${esc(t('pTotal'))}</td><td>${durText(R.durTotal)}</td><td class="hide-phone"></td><td>${f0(R.cons)}</td><td>${f0(R.endRest)}</td><td class="hide-phone">${f0(R.endRestPct)}</td></tr>
        <tr><td class="l">${esc(t('pAdd', { sf: S.set.sf }))}</td><td></td><td class="hide-phone"></td><td>${f0(R.add)}</td><td>${f0(R.reserve)}</td><td class="hide-phone">${f0(R.reservePct)}</td></tr>
        </tbody></table></div>
      <div class="notes"><div class="h">${esc(t('pNotes'))}</div>
        <table><thead><tr><th>${esc(t('pTime'))}</th><th>${esc(t('thAlt'))}</th>${noteCyl}</tr></thead><tbody><tr>${noteCells}</tr><tr>${noteCells}</tr></tbody></table></div>
      <div class="p-foot">${esc(t('pFoot'))}</div>
    </div>`;
}

/** Baut das Druckblatt und wählt die Stufe (fit-0 … fit-5), bei der alles auf die A5-Seite passt. */
async function preparePrint() {
  buildPrintSheet();
  const sheet = $('printSheet');
  try { await document.fonts.ready; } catch { /* ohne Schriften-API direkt messen */ }
  sheet.classList.add('measure');
  let fits = false, lvl = 0;
  for (lvl = 0; lvl <= 5; lvl++) {
    sheet.className = 'print-sheet measure fit-' + lvl;
    const a5 = $('printA5'), foot = a5.querySelector('.p-foot');
    fits = a5.scrollHeight <= a5.clientHeight + 1 && foot.getBoundingClientRect().bottom <= a5.getBoundingClientRect().bottom - 38;
    if (fits) break;
  }
  if (!fits) lvl = 5;
  sheet.className = 'print-sheet fit-' + lvl;
  return { fits, level: lvl };
}

async function doPrint() {
  const r = await preparePrint();
  if (!r.fits) showNotice(t('pTooLong'));
  window.print();
}

/* ---------- Menü ---------- */
function buildMenu() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const mine = local.mine().filter((m) => m.id !== S.id).slice(0, 8);
  $('menu').innerHTML = `
    <button type="button" class="mi only-phone" data-act="share">${esc(t('copyLink'))}</button>
    <button type="button" class="mi only-phone" data-act="qr">${esc(t('mQr'))}</button>
    <button type="button" class="mi only-phone" data-act="print">${esc(t('aPrint'))}</button>
    <button type="button" class="mi only-phone" data-act="legend">${esc(t('aLegend'))}</button>
    <button type="button" class="mi only-phone" data-act="reset">${esc(t('aReset'))}</button>
    <button type="button" class="mi" data-act="new">${esc(t('newCalc'))}</button>
    <button type="button" class="mi" data-act="theme">${esc(t(dark ? 'mThemeLight' : 'mThemeDark'))}</button>
    <button type="button" class="mi" data-act="reload">${esc(t('mReload'))}</button>
    <div class="mh">${esc(t('mMine'))}</div>
    ${mine.length ? mine.map((m) => `<div class="mine"><button type="button" class="mi" data-act="open" data-id="${esc(m.id)}"><span>${esc(m.id)} · ${m.updated ? dateText(m.updated) + ' ' + timeText(m.updated) : ''}</span></button>
      <button type="button" class="forget" data-act="forget" data-id="${esc(m.id)}" aria-label="${esc(t('mForget', { id: m.id }))}">${ICON.x.replace('<svg ', '<svg width="12" height="12" ')}</button></div>`).join('')
    : `<div class="mi" style="display:flex;align-items:center;min-height:36px;padding:0 14px;color:var(--text-dim)">${esc(t('mNone'))}</div>`}`;
}
function toggleMenu(open) {
  const m = $('menu'), want = open == null ? m.hidden : open;
  if (want) buildMenu();
  m.hidden = !want; $('menuBtn').setAttribute('aria-expanded', String(want));
}

function setTheme(th) {
  document.documentElement.dataset.theme = th;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = th === 'dark' ? '#0b1017' : '#f4f5f7';
  prefs.set({ theme: th });
}

async function resetCalc() {
  if (!(await confirmDlg(t('confirmReset'), t('yesReset')))) return;
  const d = DEFAULTS();
  S = { ...d, id: S.id, rev: S.rev, units: S.units };
  if (S.id) touch(); else renderResults();
  renderInputs();
}
function newCalc() {
  history.pushState(null, '', baseUrl());
  S = DEFAULTS(); sync.state = 'demo'; hideNotice(); renderAll(); window.scrollTo(0, 0);
}

/* ---------- Ereignisse ---------- */
function wire() {
  document.querySelectorAll('#langSeg button').forEach((b) => b.addEventListener('click', () => { setLang(b.dataset.lang); prefs.set({ lang: b.dataset.lang }); renderAll(); }));
  $('pUnitSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.dataset.unit === S.units.p) return; S.units.p = b.dataset.unit; touch(); renderInputs(); renderResults(); });
  $('altUnitSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.dataset.unit === S.units.alt) return; S.units.alt = b.dataset.unit; touch(); renderInputs(); renderResults(); });

  // Zylinder
  $('cylBody').addEventListener('input', (e) => {
    const el = e.target, tr = el.closest('tr[data-i]'); if (!tr || !el.dataset.f) return;
    const c = S.cyl[+tr.dataset.i];
    if (el.dataset.f === 'nr') c.nr = el.value.trim().slice(0, 8);
    else {
      const v = toNum(el.value), ok = el.value.trim() === '' ? true : v >= 0 && v <= (el.dataset.f === 'size' ? 200 : pToUnit(400, S.units.p));
      el.classList.toggle('bad', !ok); if (!ok) return;
      if (el.dataset.f === 'size') c.size = v || 0; else c.p = pFromUnit(v || 0, S.units.p);
    }
    touch();
  });
  $('cylBody').addEventListener('change', (e) => {
    const el = e.target, tr = el.closest('tr[data-i]'); if (!tr || el.classList.contains('bad')) return;
    const c = S.cyl[+tr.dataset.i];
    if (el.dataset.f === 'size' && c.size) el.value = c.size.toFixed(1);
    if (el.dataset.f === 'p' && c.p) el.value = pText(c.p, S.units.p);
  });
  $('cylBody').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'addCyl') {
      const last = S.cyl[S.cyl.length - 1] || { size: 2, p: 200 };
      const nums = S.cyl.map((c) => parseInt(c.nr, 10)).filter(Number.isFinite);
      S.cyl.push({ nr: String(nums.length === S.cyl.length ? Math.max(0, ...nums) + 1 : S.cyl.length + 1), size: last.size, p: last.p });
      touch(); renderInputs(); renderResults();
      const rows = document.querySelectorAll('#cylBody tr[data-i]'); rows[rows.length - 1].querySelector('[data-f="p"]').select();
    } else if (b.dataset.act === 'del' && S.cyl.length > 1) {
      S.cyl.splice(+b.closest('tr').dataset.i, 1); touch(); renderInputs(); renderResults();
    }
  });

  // Einstellungen
  const setField = (id, apply, lo, hi) => $(id).addEventListener('input', (e) => {
    const v = toNum(e.target.value), ok = v >= lo && v <= hi;
    e.target.classList.toggle('bad', !ok); if (!ok) return;
    apply(v); touch();
  });
  setField('setPersons', (v) => { S.set.persons = Math.round(v); }, 1, 20);
  setField('setSf', (v) => { S.set.sf = v; }, 0, 300);
  $('setStart').addEventListener('input', (e) => {
    // Zahl in der angezeigten Einheit; «9000 ft», «FL090» oder «2800 m» stellen die Einheit um
    const raw = e.target.value.trim().toLowerCase();
    let u = S.set.startU, m;
    if (/^fl/.test(raw) || /ft$/.test(raw)) { u = 'ft'; m = parseAlt(raw, 'ft') / FT_PER_M; }
    else if (/m$/.test(raw)) { u = 'm'; m = toNum(raw); }
    else { const v = toNum(raw); m = u === 'm' ? v : v / FT_PER_M; }
    const ok = m >= 0 && m <= 12000;
    e.target.classList.toggle('bad', !ok); if (!ok) return;
    S.set.startM = m; S.set.startU = u; $('lblStart').innerHTML = t('fStart_html', { u }); touch();
  });
  $('setStart').addEventListener('change', (e) => { if (!e.target.classList.contains('bad')) e.target.value = String(startValue()); });
  $('setRest').addEventListener('input', (e) => {
    const v = toNum(e.target.value), bar = pFromUnit(v, S.units.p), ok = bar >= 0 && bar <= 300;
    e.target.classList.toggle('bad', !ok); if (!ok) return; S.set.rest = bar; touch();
  });
  setField('setClimb', (v) => { S.set.climb = v; }, 0.1, 20);
  setField('setSink', (v) => { S.set.sink = v; }, 0.1, 20);
  $('bodySet').addEventListener('click', (e) => { if (e.target.id === 'factorReset') { S.set.factor = 1; touch(); } });

  // Fahrtprofil
  $('profBody').addEventListener('input', (e) => {
    const el = e.target, tr = el.closest('tr[data-i]'); if (!tr || !el.dataset.f) return;
    const l = S.prof[+tr.dataset.i];
    const v = el.dataset.f === 'alt' ? parseAlt(el.value, S.units.alt) : parseDur(el.value);
    const ok = el.dataset.f === 'alt' ? v >= 0 && v <= 60000 : v >= 0 && v <= 200;
    el.classList.toggle('bad', !ok); if (!ok) return;
    if (el.dataset.f === 'alt') l.alt = v; else l.dur = v;
    touch();
  });
  $('profBody').addEventListener('change', (e) => {
    const el = e.target, tr = el.closest('tr[data-i]'); if (!tr || el.classList.contains('bad')) return;
    const l = S.prof[+tr.dataset.i];
    el.value = el.dataset.f === 'alt' ? aT(l.alt) : durText(l.dur);
  });
  $('profBody').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'addLvl') {
      const last = S.prof[S.prof.length - 1] || { alt: 10000, dur: 1 };
      S.prof.push({ alt: last.alt, dur: 1 }); touch(); renderInputs(); renderResults();
      const rows = document.querySelectorAll('#profBody tr[data-i]'); rows[rows.length - 1].querySelector('[data-f="alt"]').select();
    } else if (b.dataset.act === 'del') { S.prof.splice(+b.closest('tr').dataset.i, 1); touch(); renderInputs(); renderResults(); }
  });

  // Kopfzeile, Link-Zeile, Fusszeile
  $('copyBtn').addEventListener('click', (e) => copyLink(e.currentTarget));
  $('shareBtn').addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title: t('docTitle'), url: shareUrl() }); return; } catch { /* abgebrochen: kopieren */ } }
    copyLink($('copyBtn'));
  });
  $('shareUrl').addEventListener('focus', (e) => e.target.select());
  $('qrBtn').addEventListener('click', showQr);
  $('printBtn').addEventListener('click', doPrint);
  $('legendBtn').addEventListener('click', showLegend);
  $('legendLink').addEventListener('click', showLegend);
  $('resetBtn').addEventListener('click', resetCalc);
  $('newBtn').addEventListener('click', newCalc);
  $('trackBtn').addEventListener('click', showTrack);
  $('bottombar').addEventListener('click', (e) => { if (e.target.closest('#trackBtn2')) showTrack(); });

  $('menuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
  document.addEventListener('click', (e) => { if (!$('menu').hidden && !e.target.closest('.menu-wrap')) toggleMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });
  $('menu').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act;
    if (act !== 'forget') toggleMenu(false);
    if (act === 'share') copyLink(null);
    else if (act === 'qr') showQr();
    else if (act === 'print') doPrint();
    else if (act === 'legend') showLegend();
    else if (act === 'reset') resetCalc();
    else if (act === 'new') newCalc();
    else if (act === 'theme') setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    else if (act === 'open') { location.hash = '#' + b.dataset.id; }
    else if (act === 'forget') { local.forget(b.dataset.id); buildMenu(); }
    else if (act === 'reload') {
      try { if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); }
        if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } } catch { /* trotzdem neu laden */ }
      location.reload();
    }
  });

  // einklappbare Abschnitte (nur auf dem Handy wirksam)
  document.querySelectorAll('.panel-toggle').forEach((btn) => btn.addEventListener('click', () => {
    if (!window.matchMedia('(max-width: 720px)').matches) return;
    const box = btn.closest('.collapsible'); const c = box.classList.toggle('collapsed');
    btn.setAttribute('aria-expanded', String(!c));
  }));

  window.addEventListener('hashchange', loadFromHash);
  window.addEventListener('beforeprint', () => { if (!$('printA5')) buildPrintSheet(); });
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !S.id || !remote.configured || sync.state === 'saving') return;
    const id = S.id, rem = await remote.get(id);
    if (rem && rem.data && S.id === id && (rem.data.updated || '') > (S.updated || '')) {
      S = normalize({ ...rem.data, id }); local.save(S); sync.state = 'saved'; sync.time = rem.updated; sync.expires = rem.expires; renderAll();
    }
  });
}

/* ---------- Start ---------- */
(function boot() {
  const p = prefs.get();
  setLang(p.lang || 'de');
  if (p.theme === 'dark') setTheme('dark');
  wire();
  renderAll();
  loadFromHash();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.O2 = { state: () => S, result: () => R, preparePrint };       // für Tests und Fehlersuche
}());
