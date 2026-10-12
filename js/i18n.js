/* EDS O2-Planung — Texte Deutsch (Vorgabe) und Englisch. Schlüssel mit _html enthalten Markup. */

const SRC = 'https://www.mhoxygen.com/2016/wp-content/uploads/Cylinder-Duration-Chart-6-2014Rev8md.pdf';

const de = {
  docTitle: 'EDS O2-Planung',
  title_html: 'EDS O<sub>2</sub>-Planung',
  eyebrow: 'Sauerstoffplanung', eyebrowDev: ' · EDS O2D2-2G',
  subtitle: 'Vorrat, Verbrauch und Reichweite über das Fahrtprofil',
  aReset: 'Zurücksetzen auf die Beispielwerte', aShare: 'Link dieser Berechnung teilen', aPrint: 'Drucken (A5)', aLegend: 'Legende und Quelle', aMenu: 'Menü', aLang: 'Sprache',
  myCalc: 'Meine Berechnung', aUrl: 'Link dieser Berechnung', copyLink: 'Link kopieren', copied: 'Kopiert', aQr: 'QR-Code des Links gross anzeigen',
  stDemo: 'Beispielwerte · noch nicht gespeichert',
  stSaved: 'gespeichert {time} · bleibt bis {date}', stSaving: 'speichert …', stLocal: 'nur auf diesem Gerät gespeichert ({time})',
  track: 'Stand nachführen', trackShort: 'Nachführen', newCalc: 'Neue Berechnung',
  supply: 'Sauerstoffvorrat', settings: 'Einstellungen', profile: 'Fahrtprofil', result: 'Resultat',
  thNr: 'Nr.', thSize: 'Grösse L', thP: 'Druck {u}', thContent: 'Inhalt L', thUsable: 'nutzbar L', remove: 'Entfernen',
  aCylNr: 'Zylindernummer', aCylSize: 'Grösse in Liter', aCylP: 'Druck in {u}', aCylDel: 'Zylinder {nr} entfernen',
  addCyl: '+ Zylinder', sum: 'Summe', usableHint: 'nutzbar = Inhalt bis {p} {u} Restdruck',
  fPersons: 'Personen', fSf: 'Sicherheit %', fStart_html: 'O<sub>2</sub> ab {u}', fRest: 'Restdruck {u}', fClimb: 'Steigen m/s', fSink: 'Sinken m/s',
  deliveryHint: 'Abgabe: Kanüle bis FL180, darüber Maske im F-Modus (rechnet die App selbst).',
  factorLine: 'Verbrauchsfaktor {f} aus dem Nachführen.', factorReset: 'zurücksetzen',
  setSum: '{n} Personen · {sf} % · ab {start}', setSum1: '1 Person · {sf} % · ab {start}',
  thLevel: 'Höhenstufe', thAlt: 'Höhe', thDur: 'Dauer h:mm', addLevel: '+ Höhenstufe', profHint: 'Steigen und Sinken ergänzt die App selbst',
  aLvlAlt: 'Höhe der Höhenstufe {n}', aLvlDur: 'Dauer der Höhenstufe {n}', aLvlDel: 'Höhenstufe {n} entfernen',
  profSum: '{n} Höhenstufen · {dur} h · höchste {alt}', profSum1: '1 Höhenstufe · {dur} h · {alt}', profSum0: 'noch keine Höhenstufe',
  stOk: 'Sauerstoffvorrat ist genügend', stTight: 'Sauerstoffvorrat ist knapp', stShort: 'Sauerstoffvorrat ist ungenügend', stNone: 'Kein Sauerstoffvorrat erfasst',
  stDetail: 'für das Profil von {dur} h, davon {o2} h am Sauerstoff', stNoO2: 'Das Profil bleibt unter {start}: kein Sauerstoff nötig',
  kUsable: 'Nutzbarer Vorrat', sCyl: '{n} Zylinder', kNeed: 'Bedarf inkl. {sf} %', kReserve: 'Reserve', sReserve: '{pct} % des Vorrats',
  kMissing: 'Fehlmenge', sMissing: 'zum Bedarf inkl. Zuschlag', kRange: 'Reichweite', sRange: '{alt}, {n} Personen', sRange1: '{alt}, 1 Person',
  wMask: 'Über FL180 rechnet die App mit Maske und F-Modus. Die Kanüle genügt dort laut Hersteller nicht.',
  wHigh: 'Über 25 000 ft gibt es keine Herstellerwerte; der Verbrauch ist dort extrapoliert.',
  wLow: 'Zylinder {nr} liegt am oder unter dem Restdruck und zählt nicht zum Vorrat.',
  chartTitle: 'Verlauf · Höhe und Restvorrat', chartStart: 'Sauerstoff ab {start}', chartEnd: 'Rest {l} L · {pct} %', chartEmptyAxis: 'leer', chartNo: 'Noch keine Höhenstufe erfasst',
  chartAria: 'Oben das Höhenprofil der Fahrt, unten der Restvorrat an Sauerstoff über die Zeit; am Ende bleiben {l} Liter.',
  rowsTitle: 'Verbrauch je Höhenstufe · {n} Personen', rowsTitle1: 'Verbrauch je Höhenstufe · 1 Person',
  thDurS: 'Dauer', thRate: 'L/h je Pers.', thCons: 'Verbrauch L', thRest: 'Rest L', thRestPct: 'Rest %',
  up: 'Steigen', down: 'Sinken', total: 'Verbrauch total', addRow: 'Sicherheitszuschlag {sf} %',
  rowsHint: 'Grau hinterlegt: von der App ergänztes Steigen ({c} m/s) und Sinken ({s} m/s), Rate als Mittelwert. Unter {start} kein Verbrauch; der Aufstieg zur ersten Höhenstufe und der Abstieg unter {start} zählen deshalb nicht.',
  resToggle: 'Resultat · Verbrauch je Höhenstufe', rowsSum: '{cons} L · Bedarf inkl. Zuschlag {need} L',
  srcLine_html: `Verbrauchswerte: <a href="${SRC}" target="_blank" rel="noopener">Mountain High, Cylinder Duration Chart</a>`,
  legendLink: 'Legende', disclaimer: 'Planungshilfe. Die Druckanzeige im Flug bleibt massgebend.',
  bbReserve: 'Reserve {l} L · {pct} % · {range} h', bbReserveNoRange: 'Reserve {l} L · {pct} %', bbMissing: 'Es fehlen {l} L',
  mThemeDark: 'Dunkle Darstellung', mThemeLight: 'Helle Darstellung', mMine: 'Meine Berechnungen', mNone: 'Noch keine gespeichert', mForget: '{id} aus der Liste entfernen',
  mReload: 'App neu laden (neueste Version)', mQr: 'QR-Code anzeigen',
  confirmReset: 'Alle Eingaben dieser Berechnung auf die Beispielwerte zurücksetzen?', yesReset: 'Zurücksetzen', cancel: 'Abbrechen', close: 'Schliessen',
  notFound: 'Berechnung {id} wurde nicht gefunden (abgelaufen oder auf diesem Gerät nie geöffnet). Es sind die Beispielwerte geladen.',
  lgTitle: 'Legende und Quelle', lgSrcH: 'Quelle der Verbrauchswerte',
  lgSrc_html: `<a href="${SRC}" target="_blank" rel="noopener">Mountain High: Cylinder Duration Chart (PDF)</a>, Revision 06/2017, Spalten EDS, je eine Person. Kanüle in den Modi N, D5 und D10; Maske im F-Modus. Die Werte stammen vom Hersteller Mountain High Equipment &amp; Supply Company und sind nicht Teil dieser App; alle Rechte daran liegen bei Mountain High. Es besteht keine Verbindung zum Hersteller.`,
  lgNodesH: 'Stützpunkte aus der Tabelle', lgAlt: 'Höhe', lgDel: 'Abgabe', lgRate: 'L/h je Person', cannula: 'Kanüle', mask: 'Maske',
  lgCalcH: 'So rechnet die App',
  lgCalc: [
    'Zwischen den Stützpunkten linear; über 25 000 ft extrapoliert und gemeldet.',
    'Unter 10 000 ft linear weitergeführt, mindestens 8 L/h (Annahme, kein Herstellerwert).',
    'Unter der Beginnhöhe (Vorgabe 2800 m) kein Verbrauch.',
    'Steigen mit 1.5 m/s und Sinken mit 2.0 m/s (Vorgabe), von der App ergänzt.',
    'Zylinderinhalt mit Realgasfaktor für Sauerstoff bei 15 °C.',
    'Bedarf = Verbrauch × Personen × (1 + Sicherheitsfaktor).',
  ],
  lgInputH: 'Eingabe', lgInput: 'Höhe: «FL120», «120» oder «12000»; unter 5000 ft in Fuss. Dauer: «2:30» oder «2.5». Beginnhöhe: Zahl in Metern; «9000 ft» oder «FL090» stellt auf Fuss um.',
  lgSignsH: 'Zeichen', sgOk: 'deckt auch den Zuschlag.', sgTight: 'deckt den Zuschlag nicht.', sgShort: 'unter dem Verbrauch.',
  lgFine: 'Planungshilfe. Die Druckanzeige im Flug bleibt massgebend. App © Balthasar Wicki, Wicki Aero GmbH; Verbrauchswerte von Mountain High.',
  trTitle: 'Stand nachführen', trCalc: 'Berechnung {id}', trCalcNew: 'Neue Berechnung', trWhere: 'Wo stehen wir?', trLevel: 'Höhe jetzt', trElapsed: 'Dauer auf Höhenstufe (h:mm)',
  trPlan: 'Laut Plan dauert Höhenstufe {n} ({alt}) {dur}.', trNextUp: ' Danach Steigen auf {alt}.', trNextDown: ' Danach Sinken auf {alt}.', trNextEnd: ' Danach Abstieg.',
  trPNow: 'Druck jetzt', trCyl: 'Zylinder', trAtStart: 'beim Start', trNow: 'jetzt {u}', aTrP: 'Druck Zylinder {nr} jetzt in {u}',
  trCompare: 'Vergleich mit Plan', trIst: 'Rest Ist', trPlanRest: 'Rest Plan', trDev: 'Abweichung',
  trUsed: 'Verbraucht {a} L statt {p} L: Faktor {f}', trNoPlan: 'Bis hierher war laut Plan kein Sauerstoff nötig; ein Faktor lässt sich nicht bilden.',
  trAdopt: 'Faktor {f} für den Rest der Fahrt übernehmen',
  trRest: 'für die restlichen {dur} h · Bedarf {need} L inkl. {sf} % · Reserve {res} L · {pct} %', trRestShort: 'für die restlichen {dur} h · Bedarf {need} L inkl. {sf} % · es fehlen {l} L',
  trApply: 'Übernehmen und speichern', aBack: 'Zurück zur Planung',
  pCut: 'Schnitt · links A5', pPrinted: 'gedruckt {dt}', pUsable: 'Nutzbar', pNeed: 'Bedarf +{sf} %', pReserve: 'Reserve', pMissing: 'Fehlmenge', pRange: 'Reichw. {alt}', pStatusRes: ' · Reserve {pct} %',
  pPersons: 'Personen', pSf: 'Sicherheit', pStart_html: 'O<sub>2</sub> ab', pRest: 'Restdruck', pClimbSink: 'Steigen/Sinken', pFactor: 'Verbrauchsfaktor',
  thRateP: 'L/h·P', thConsP: 'Verbr. L', thRestPctP: '%', pTotal: 'Total', pAdd: 'Zuschlag {sf} %', pNotes: 'Nachgeführt im Flug (von Hand)', pTime: 'Zeit', pCylNow: 'Zyl. {nr} {u}',
  pFoot: 'Verbrauchswerte: Mountain High, Cylinder Duration Chart. Planungshilfe; die Druckanzeige im Flug bleibt massgebend.',
  pTooLong: 'Der Ausdruck passt auch in kleinster Schrift nicht auf eine A5-Seite. Bitte Zylinder oder Höhenstufen zusammenfassen.',
  qrAria: 'QR-Code mit dem Link dieser Berechnung',
};

const en = {
  docTitle: 'EDS O2 Planning',
  title_html: 'EDS O<sub>2</sub> Planning',
  eyebrow: 'Oxygen planning', eyebrowDev: ' · EDS O2D2-2G',
  subtitle: 'Supply, consumption and endurance over the flight profile',
  aReset: 'Reset to the example values', aShare: 'Share the link to this calculation', aPrint: 'Print (A5)', aLegend: 'Legend and source', aMenu: 'Menu', aLang: 'Language',
  myCalc: 'My calculation', aUrl: 'Link to this calculation', copyLink: 'Copy link', copied: 'Copied', aQr: 'Show the QR code of the link enlarged',
  stDemo: 'Example values · not saved yet',
  stSaved: 'saved {time} · kept until {date}', stSaving: 'saving …', stLocal: 'saved on this device only ({time})',
  track: 'Update status', trackShort: 'Update', newCalc: 'New calculation',
  supply: 'Oxygen supply', settings: 'Settings', profile: 'Flight profile', result: 'Result',
  thNr: 'No.', thSize: 'Size L', thP: 'Pressure {u}', thContent: 'Content L', thUsable: 'usable L', remove: 'Remove',
  aCylNr: 'Cylinder number', aCylSize: 'Size in litres', aCylP: 'Pressure in {u}', aCylDel: 'Remove cylinder {nr}',
  addCyl: '+ Cylinder', sum: 'Total', usableHint: 'usable = content down to {p} {u} residual pressure',
  fPersons: 'Persons', fSf: 'Safety %', fStart_html: 'O<sub>2</sub> from {u}', fRest: 'Residual {u}', fClimb: 'Climb m/s', fSink: 'Descent m/s',
  deliveryHint: 'Delivery: cannula up to FL180, mask in F mode above (handled by the app).',
  factorLine: 'Consumption factor {f} from the status update.', factorReset: 'reset',
  setSum: '{n} persons · {sf} % · from {start}', setSum1: '1 person · {sf} % · from {start}',
  thLevel: 'Level', thAlt: 'Altitude', thDur: 'Duration h:mm', addLevel: '+ Level', profHint: 'Climbs and descents are added by the app',
  aLvlAlt: 'Altitude of level {n}', aLvlDur: 'Duration of level {n}', aLvlDel: 'Remove level {n}',
  profSum: '{n} levels · {dur} h · highest {alt}', profSum1: '1 level · {dur} h · {alt}', profSum0: 'no level yet',
  stOk: 'Oxygen supply is sufficient', stTight: 'Oxygen supply is marginal', stShort: 'Oxygen supply is insufficient', stNone: 'No oxygen supply entered',
  stDetail: 'for the profile of {dur} h, of which {o2} h on oxygen', stNoO2: 'The profile stays below {start}: no oxygen needed',
  kUsable: 'Usable supply', sCyl: '{n} cylinders', kNeed: 'Demand incl. {sf} %', kReserve: 'Reserve', sReserve: '{pct} % of the supply',
  kMissing: 'Shortfall', sMissing: 'against demand incl. margin', kRange: 'Endurance', sRange: '{alt}, {n} persons', sRange1: '{alt}, 1 person',
  wMask: 'Above FL180 the app calculates with mask and F mode. According to the manufacturer the cannula is not sufficient there.',
  wHigh: 'There are no manufacturer values above 25 000 ft; consumption is extrapolated there.',
  wLow: 'Cylinder {nr} is at or below the residual pressure and does not count towards the supply.',
  chartTitle: 'Course · altitude and remaining supply', chartStart: 'Oxygen from {start}', chartEnd: 'Remaining {l} L · {pct} %', chartEmptyAxis: 'empty', chartNo: 'No level entered yet',
  chartAria: 'Top: the altitude profile of the flight; bottom: the remaining oxygen supply over time; {l} litres remain at the end.',
  rowsTitle: 'Consumption per level · {n} persons', rowsTitle1: 'Consumption per level · 1 person',
  thDurS: 'Duration', thRate: 'L/h per pers.', thCons: 'Consumption L', thRest: 'Remaining L', thRestPct: 'Rem. %',
  up: 'Climb', down: 'Descent', total: 'Total consumption', addRow: 'Safety margin {sf} %',
  rowsHint: 'Shaded: climbs ({c} m/s) and descents ({s} m/s) added by the app, rate as mean value. No consumption below {start}; the climb to the first level and the descent below {start} therefore do not count.',
  resToggle: 'Result · consumption per level', rowsSum: '{cons} L · demand incl. margin {need} L',
  srcLine_html: `Consumption values: <a href="${SRC}" target="_blank" rel="noopener">Mountain High, Cylinder Duration Chart</a>`,
  legendLink: 'Legend', disclaimer: 'Planning aid. The pressure gauge in flight remains authoritative.',
  bbReserve: 'Reserve {l} L · {pct} % · {range} h', bbReserveNoRange: 'Reserve {l} L · {pct} %', bbMissing: '{l} L short',
  mThemeDark: 'Dark appearance', mThemeLight: 'Light appearance', mMine: 'My calculations', mNone: 'None saved yet', mForget: 'Remove {id} from the list',
  mReload: 'Reload app (latest version)', mQr: 'Show QR code',
  confirmReset: 'Reset all entries of this calculation to the example values?', yesReset: 'Reset', cancel: 'Cancel', close: 'Close',
  notFound: 'Calculation {id} was not found (expired or never opened on this device). The example values are loaded.',
  lgTitle: 'Legend and source', lgSrcH: 'Source of the consumption values',
  lgSrc_html: `<a href="${SRC}" target="_blank" rel="noopener">Mountain High: Cylinder Duration Chart (PDF)</a>, revision 06/2017, EDS columns, one person each. Cannula in modes N, D5 and D10; mask in F mode. The figures come from the manufacturer, Mountain High Equipment &amp; Supply Company, and are not part of this app; all rights in them remain with Mountain High. There is no affiliation with the manufacturer.`,
  lgNodesH: 'Reference points from the chart', lgAlt: 'Altitude', lgDel: 'Delivery', lgRate: 'L/h per person', cannula: 'Cannula', mask: 'Mask',
  lgCalcH: 'How the app calculates',
  lgCalc: [
    'Linear between the reference points; extrapolated and flagged above 25 000 ft.',
    'Continued linearly below 10 000 ft, at least 8 L/h (assumption, not a manufacturer value).',
    'No consumption below the start altitude (default 2800 m).',
    'Climb at 1.5 m/s and descent at 2.0 m/s (defaults), added by the app.',
    'Cylinder content with the real-gas factor for oxygen at 15 °C.',
    'Demand = consumption × persons × (1 + safety factor).',
  ],
  lgInputH: 'Input', lgInput: 'Altitude: “FL120”, “120” or “12000”; below 5000 ft in feet. Duration: “2:30” or “2.5”. Start altitude: number in metres; “9000 ft” or “FL090” switches to feet.',
  lgSignsH: 'Signs', sgOk: 'also covers the margin.', sgTight: 'does not cover the margin.', sgShort: 'below the consumption.',
  lgFine: 'Planning aid. The pressure gauge in flight remains authoritative. App © Balthasar Wicki, Wicki Aero GmbH; consumption figures by Mountain High.',
  trTitle: 'Update status', trCalc: 'Calculation {id}', trCalcNew: 'New calculation', trWhere: 'Where are we?', trLevel: 'Altitude now', trElapsed: 'Time at this level (h:mm)',
  trPlan: 'As planned, level {n} ({alt}) lasts {dur}.', trNextUp: ' Then climb to {alt}.', trNextDown: ' Then descent to {alt}.', trNextEnd: ' Then final descent.',
  trPNow: 'Pressure now', trCyl: 'Cylinder', trAtStart: 'at start', trNow: 'now {u}', aTrP: 'Pressure of cylinder {nr} now in {u}',
  trCompare: 'Comparison with plan', trIst: 'Remaining actual', trPlanRest: 'Remaining plan', trDev: 'Deviation',
  trUsed: 'Used {a} L instead of {p} L: factor {f}', trNoPlan: 'According to the plan no oxygen was needed up to here; no factor can be derived.',
  trAdopt: 'Apply factor {f} to the rest of the flight',
  trRest: 'for the remaining {dur} h · demand {need} L incl. {sf} % · reserve {res} L · {pct} %', trRestShort: 'for the remaining {dur} h · demand {need} L incl. {sf} % · {l} L short',
  trApply: 'Apply and save', aBack: 'Back to planning',
  pCut: 'Cut · left A5', pPrinted: 'printed {dt}', pUsable: 'Usable', pNeed: 'Demand +{sf} %', pReserve: 'Reserve', pMissing: 'Shortfall', pRange: 'Endur. {alt}', pStatusRes: ' · reserve {pct} %',
  pPersons: 'Persons', pSf: 'Safety', pStart_html: 'O<sub>2</sub> from', pRest: 'Residual', pClimbSink: 'Climb/descent', pFactor: 'Consumption factor',
  thRateP: 'L/h·P', thConsP: 'Cons. L', thRestPctP: '%', pTotal: 'Total', pAdd: 'Margin {sf} %', pNotes: 'Updated in flight (by hand)', pTime: 'Time', pCylNow: 'Cyl. {nr} {u}',
  pFoot: 'Consumption values: Mountain High, Cylinder Duration Chart. Planning aid; the pressure gauge in flight remains authoritative.',
  pTooLong: 'Even in the smallest type the printout does not fit on one A5 page. Please combine cylinders or levels.',
  qrAria: 'QR code with the link to this calculation',
};

const DICT = { de, en };
let lang = 'de';

export const setLang = (l) => { lang = DICT[l] ? l : 'de'; return lang; };
export const getLang = () => lang;

/** Text zum Schlüssel, {platzhalter} werden ersetzt. */
export function t(key, vars) {
  let s = DICT[lang][key];
  if (s == null) s = de[key];
  if (s == null) return key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

/** Statische Elemente beschriften: data-i18n (Text), data-i18n-html (Markup), data-i18n-aria (aria-label + title). */
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { const s = t(el.dataset.i18nAria); el.setAttribute('aria-label', s); el.title = s; });
  document.documentElement.lang = lang;
  document.title = t('docTitle');
}
