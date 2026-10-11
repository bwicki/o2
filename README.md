# EDS O2-Planung

Sauerstoffplanung für Fahrten mit dem Mountain High **EDS O2D2-2G**: Reicht der
Vorrat für das geplante Fahrtprofil, wie gross ist die Reserve, und wie lange
reicht sie auf der höchsten Höhenstufe?

**https://o2.wicki.aero**

Planungshilfe. Massgebend bleiben die Druckanzeige im Flug und die Unterlagen
des Herstellers.

## Bedienung

1. **Sauerstoffvorrat** — je Zylinder Nummer, Grösse in Litern und Druck (bar oder psi).
2. **Einstellungen** — Personen, Sicherheitszuschlag, Höhe, ab der Sauerstoff genommen wird, Restdruck, Steigen und Sinken.
3. **Fahrtprofil** — Höhenstufen (ft/FL oder m) mit Dauer. Steigen und Sinken zwischen den Stufen ergänzt die App.
4. **Resultat** — Bilanz, Verlauf und Verbrauch je Höhenstufe.

Mit der ersten Änderung entsteht «Meine Berechnung» mit einem Kurzcode in der
Adresse (`o2.wicki.aero/#ABC234`). Wer diese Adresse kennt, kann die Berechnung
öffnen und ändern; die Startadresse ohne Code zeigt immer die Beispielwerte.
**Stand nachführen** vergleicht im Flug den abgelesenen Druck mit dem Plan und
rechnet den Rest der Fahrt neu. **Drucken** gibt ein A5-Blatt auf der linken
Hälfte eines A4 quer aus.

## Rechenmodell

- **Verbrauch** je Person aus der Mountain High
  [Cylinder Duration Chart](https://www.mhoxygen.com/2016/wp-content/uploads/Cylinder-Duration-Chart-6-2014Rev8md.pdf)
  (Inhalt ÷ Dauer): EDS mit Kanüle 16.3 L/h auf 10 000 ft, 33.7 L/h auf 15 000 ft,
  43.3 L/h auf 18 000 ft; EDS mit Maske (F-Modus) 63.2 L/h auf 20 000 ft und
  96.9 L/h auf 25 000 ft. Dazwischen linear; über FL180 gilt die Maskenkurve.
- **Annahmen**, die nicht aus der Tabelle stammen: unter 10 000 ft lineare
  Verlängerung mit Untergrenze 8 L/h; über 25 000 ft Verlängerung mit Warnung;
  unter der eingestellten Beginnhöhe kein Verbrauch; Steigen 1.5 m/s, Sinken
  2.0 m/s (einstellbar).
- **Zylinderinhalt** mit dem Realgasfaktor von Sauerstoff bei 15 °C, bezogen auf
  1.013 bar und 21 °C. Nutzbar ist der Inhalt bis zum Restdruck (Vorgabe 15 bar).
- **Bedarf** = Verbrauch × (1 + Sicherheitszuschlag). **Reichweite** = Reserve ÷
  Verbrauch auf der höchsten Höhenstufe.

Code: `js/model.js`, Tests: `test/model.test.mjs`.

## Aufbau

| Teil | Ort |
|---|---|
| App (statisch, GitHub Pages) | `index.html`, `css/`, `js/`, `sw.js` |
| Speicher-Server (Cloudflare Worker + KV, 6 Monate Aufbewahrung) | `worker/` |
| Einrichtung | [SETUP.md](SETUP.md) |
| Änderungen | [CHANGELOG.md](CHANGELOG.md) |

Ohne Speicher-Server läuft die App vollständig: Berechnungen liegen dann auf
dem Gerät, und der kopierte Link trägt den Stand als Anhang mit.

Tests: `npm test` (Rechenmodell, Worker), `python3 test/ui.smoke.py http://localhost:8080/ <Ordner>` (Oberfläche, benötigt Playwright).

Neue Version: Nummer in `js/version.js`, `sw.js`, `package.json`,
`worker/wrangler.toml` und `CHANGELOG.md` gleich setzen (ein Test prüft das).

## Lizenz

© 2026 Balthasar Wicki, Wicki Aero GmbH. Quelltext zur Einsicht, alle Rechte
vorbehalten — siehe [LICENSE](LICENSE). Schriften IBM Plex Mono und Inter (SIL
OFL 1.1), qrcode-generator (MIT). Keine Verbindung zu Mountain High E&S Co.
