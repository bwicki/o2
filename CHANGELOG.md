# Änderungen

## 0.2.0 — 2026-10-12

- **Persönlicher Kurzcode («Meine Konfiguration»):** Vorrat (1) und Einstellungen (2) lassen sich unter einem selbst gewählten Kurzcode (3–20 Buchstaben oder Ziffern, ohne Kennwort) speichern und auf jedem Gerät wieder laden. Ein Kurzcode wird nur einmal vergeben: Speichern unter einem vergebenen Kurzcode geht erst, nachdem man ihn auf dem Gerät geladen hat. Das Gerät merkt sich den Kurzcode; neue Berechnungen beginnen dann mit der eigenen Konfiguration. Aufbewahrung 2 Jahre ab der letzten Nutzung.
- **Zylinderwechsel-Plan:** Alle Personen atmen aus demselben Zylinder, geleert wird in der erfassten Reihenfolge. Der Verlauf zeigt jeden Wechsel als gestrichelte Linie mit dem Zeitpunkt, darunter steht der Plan als Zeile (auch im Druck); «Vorrat leer nach …», wenn es nicht reicht.
- **Titel der Fahrt (fakultativ):** erscheint im Fenstertitel, im Druck und in der Liste «Meine Berechnungen».
- **Übernahme aus dem Fahrtbriefing:** Ein Link `#i.…` übergibt ein Fahrtprofil (Höhenstufen in ft, Dauer in h, Titel). Übernommene Verläufe enthalten Steigen und Sinken bereits; die App ergänzt dann keine Übergänge (umschaltbar).
- **Sauerstoffregel:** Meldung, wenn das Profil Zeit ohne Sauerstoff über 13 000 ft oder mehr als 30 Minuten zwischen 10 000 und 13 000 ft enthält (Beginnhöhe über diesen Grenzen).
- Speicher-Server 0.2.0: Endpunkt `/p/<kurzcode>`, Titel und Kennzeichen «ohne Übergänge» in der Berechnung.

## 0.1.2 — 2026-10-12

- Favicon und App-Symbole: Variante 4 (O₂-Ring in vier Farben mit tiefgestellter 2) im Stil von GaforCast und Fahrtbriefing; zusätzlich `favicon.ico`.

## 0.1.1 — 2026-10-12

- Lizenz: eigener Abschnitt zu den Grundlagendaten von Mountain High (Herkunft, Rechte, eigener Anteil, keine Gewähr, keine Verbindung).
- Legende: Herkunft und Revision (06/2017) der Verbrauchswerte ausdrücklich genannt.
- README auf den Stand des Betriebs gebracht (Speicher-Server, Einrichtung, Tests, Versionen).
- Speicher-Server über den Workflow «O2 worker» im Repository `bwicki/briefing` eingerichtet; der Worker zählt seine Version eigenständig.

## 0.1.0 — 2026-10-11

Erste Fassung.

- Sauerstoffvorrat: Zylinder mit Nummer, Grösse (L) und Druck (bar oder psi); Inhalt mit Realgasfaktor, nutzbar bis Restdruck.
- Einstellungen: Personen, Sicherheitszuschlag, Beginnhöhe für Sauerstoff (m oder ft), Restdruck, Steigen und Sinken.
- Fahrtprofil: Höhenstufen in ft/FL oder m mit Dauer; Steigen und Sinken zwischen den Stufen ergänzt die App.
- Resultat: Bilanz (Vorrat, Bedarf, Reserve, Reichweite), Verlauf von Höhe und Restvorrat, Verbrauch je Höhenstufe.
- Verbrauchswerte aus der Mountain High «Cylinder Duration Chart» (EDS, Kanüle bis FL180, darüber Maske im F-Modus).
- «Meine Berechnung»: Kurzcode in der Adresse, QR-Code, Speicherung auf dem Gerät; mit Speicher-Server 6 Monate abrufbar, ohne Server trägt der kopierte Link den Stand.
- Stand nachführen: Dauer auf der Höhenstufe und Druck jetzt, Vergleich mit dem Plan, Verbrauchsfaktor für den Rest der Fahrt.
- Druck: A5 auf der linken Hälfte eines A4 quer mit Schnittzeichen; bis 6 Zylinder und 12 Höhenstufen geprüft auf einer Seite.
- Deutsch und Englisch, helle und dunkle Darstellung, als App installierbar, offline nutzbar.
