# EDS O2-Planung

Sauerstoffplanung für Fahrten mit dem Mountain High **EDS O2D2-2G**: Reicht der
Vorrat für das geplante Fahrtprofil, wie gross ist die Reserve, und wie lange
reicht sie auf der höchsten Höhenstufe?

**https://o2.wicki.aero** · Deutsch und Englisch · offen, ohne Anmeldung

Planungshilfe. Massgebend bleiben die Druckanzeige im Flug und die Unterlagen
des Herstellers. Die Verbrauchswerte stammen von Mountain High, nicht vom Autor
dieser App (siehe [Datengrundlage](#datengrundlage) und [LICENSE](LICENSE)).

## Bedienung

1. **Sauerstoffvorrat** — je Zylinder Nummer, Grösse in Litern und Druck (bar oder psi).
2. **Einstellungen** — Personen, Sicherheitszuschlag, Höhe, ab der Sauerstoff
   genommen wird (Meter oder Fuss), Restdruck, Steigen und Sinken.
3. **Fahrtprofil** — Höhenstufen (ft/FL oder m) mit Dauer. Steigen und Sinken
   zwischen den Stufen ergänzt die App selbst.
4. **Resultat** — Bilanz (Vorrat, Bedarf, Reserve, Reichweite), Verlauf von Höhe
   und Restvorrat, Verbrauch je Höhenstufe.

Eingaben: Höhe als `FL120`, `120` oder `12000`; unter 5000 ft in Fuss. Dauer als
`2:30` oder `2.5`. Beginnhöhe als Zahl in Metern; `9000 ft` oder `FL090` stellt
auf Fuss um.

Weitere Funktionen:

- **Stand nachführen** — im Flug die Dauer auf der aktuellen Höhenstufe und den
  abgelesenen Druck eingeben. Die App vergleicht mit dem Plan, bildet daraus
  einen Verbrauchsfaktor und rechnet den Rest der Fahrt neu.
- **Drucken** — A5 auf der linken Hälfte eines A4 quer, mit Schnittzeichen,
  immer eine Seite (geprüft bis 6 Zylinder und 12 Höhenstufen).
- **Zurücksetzen** — setzt die Berechnung auf die Beispielwerte zurück; der
  Kurzcode bleibt.
- Helle und dunkle Darstellung, als App installierbar, ohne Netz nutzbar.

## «Meine Berechnung» und Kurzcode

Die Startadresse ohne Code zeigt immer die Beispielwerte. Mit der ersten
Änderung entsteht eine eigene Berechnung mit einem sechsstelligen Kurzcode in
der Adresse, zum Beispiel `o2.wicki.aero/#ABC234`. Diese Adresse (oder der
QR-Code daneben) führt jederzeit dorthin zurück, auch wenn in der Zwischenzeit
andere die App benutzt haben.

- Wer die Adresse kennt, kann die Berechnung öffnen **und ändern**. Es gibt
  kein Kennwort.
- Der Stand liegt auf dem Gerät und auf dem Speicher-Server. Jede Änderung
  verlängert die Aufbewahrung um 183 Tage (rund 6 Monate); danach wird der
  Eintrag gelöscht.
- Gespeichert werden nur Rechenwerte (Zylinder, Einstellungen, Höhenstufen,
  Nachführ-Einträge), keine Personendaten.
- Ist der Server nicht erreichbar, arbeitet die App auf dem Gerät weiter
  («nur auf diesem Gerät»), und der kopierte Link trägt den Stand als Anhang mit.

## Datengrundlage

Die Verbrauchswerte sind der vom Hersteller veröffentlichten
[Cylinder Duration Chart](https://www.mhoxygen.com/2016/wp-content/uploads/Cylinder-Duration-Chart-6-2014Rev8md.pdf)
(Revision 06/2017) der **Mountain High Equipment & Supply Company** entnommen.
Die Rechte an dieser Tabelle liegen bei Mountain High. Es besteht keine
Verbindung zum Hersteller; er hat diese App weder geprüft noch freigegeben.

Aus der Tabelle (Inhalt ÷ Dauer, je Person, Spalten «EDS»):

| Höhe | Abgabe | L/h je Person |
|---|---|---|
| 10 000 ft | Kanüle (Modi N, D5, D10) | 16.3 |
| 15 000 ft | Kanüle | 33.7 |
| 18 000 ft | Kanüle | 43.3 |
| 20 000 ft | Maske (F-Modus) | 63.2 |
| 25 000 ft | Maske | 96.9 |

## Rechenmodell

Eigene Ableitungen und Annahmen (nicht vom Hersteller):

- Zwischen den Stützpunkten linear; über FL180 gilt die Maskenkurve.
- Unter 10 000 ft linear weitergeführt, mindestens 8 L/h; über 25 000 ft
  weitergeführt, mit Warnung.
- Unter der eingestellten Beginnhöhe (Vorgabe 2800 m) kein Verbrauch.
- Steigen 1.5 m/s und Sinken 2.0 m/s (einstellbar); der Verbrauch im Übergang
  ist über die Höhe gemittelt.
- **Zylinderinhalt** mit dem Realgasfaktor von Sauerstoff bei 15 °C, bezogen auf
  1.013 bar und 21 °C. Nutzbar ist der Inhalt bis zum Restdruck (Vorgabe 15 bar).
- **Bedarf** = Verbrauch × Personen × (1 + Sicherheitszuschlag).
  **Reichweite** = Reserve ÷ Verbrauch auf der höchsten Höhenstufe.
- Status: «genügend», wenn der Vorrat auch den Zuschlag deckt; «knapp», wenn er
  nur den Verbrauch deckt; «ungenügend» darunter.

Nicht bekannt ist, mit welcher F-Stufe (F1–F4) die Maskenwerte der Tabelle
gerechnet sind; die Werte über FL180 sind deshalb als Näherung zu lesen.

Code: `js/model.js`. Die Tests geben die Herstellertabelle auf 2 % genau wieder.

## Aufbau

| Teil | Ort |
|---|---|
| App (statisch, GitHub Pages, Domain über `CNAME`) | `index.html`, `css/`, `js/`, `fonts/`, `icons/`, `img/` |
| Rechenmodell, Einheiten | `js/model.js`, `js/units.js` |
| Oberfläche, Texte DE/EN, Speicherung | `js/app.js`, `js/i18n.js`, `js/store.js` |
| Version, Adresse des Speicher-Servers | `js/version.js`, `js/config.js` |
| Offline-Betrieb | `sw.js`, `manifest.webmanifest` |
| Speicher-Server (Cloudflare Worker + KV) | `worker/` |
| Tests | `test/` |

Der Speicher-Server läuft unter `https://o2-api.balthasar.workers.dev`
(Prüfung: `/health`). Deployt wird er über den Workflow «O2 worker» im
Repository [`bwicki/briefing`](https://github.com/bwicki/briefing), weil die
Cloudflare-Zugangsdaten dort bereits hinterlegt sind. Einrichtung Schritt für
Schritt: [SETUP.md](SETUP.md). Änderungen: [CHANGELOG.md](CHANGELOG.md).

## Tests

- `npm test` — Rechenmodell und Speicher-Server (läuft bei jedem Push auch als
  GitHub-Workflow «Tests»).
- `python3 test/ui.smoke.py http://localhost:8080/ <Ordner>` — Oberfläche auf
  Desktop und Handy, Druck (benötigt Playwright; vorher `npm run serve`).
- `python3 test/ui.server.py` — zwei Geräte gegen einen lokalen Ersatz-Server
  (`node test/dev-api.mjs`).

## Neue Version

Die Nummer der App steht in `js/version.js`, `sw.js`, `package.json` und
`CHANGELOG.md` und muss überall gleich sein (ein Test prüft das). Der
Speicher-Server zählt eigenständig (`worker/package.json`,
`worker/wrangler.toml`); nach Änderungen unter `worker/` den Workflow «O2
worker» erneut starten.

## Lizenz

© 2026 Balthasar Wicki, Wicki Aero GmbH. Quelltext zur Einsicht, alle Rechte
vorbehalten — siehe [LICENSE](LICENSE). Die Grundlagendaten stammen von
Mountain High und sind von der Lizenz ausgenommen (Ziffer 4). Mitgeliefert:
Schriften IBM Plex Mono und Inter (SIL OFL 1.1), qrcode-generator (MIT).
