# Einrichtung — alles im Browser

Zwei Teile: die App (GitHub Pages) und der Speicher-Server für «Meine
Berechnung» (Cloudflare). Die App läuft schon nach Teil 1; Teil 2 sorgt dafür,
dass ein Kurzcode auf jedem Gerät denselben Stand zeigt.

Schlüssel und Kennwörter nie in Dateien des Repositories schreiben und nie im
Chat weitergeben.

## 1 App auf GitHub Pages

1. Repository `bwicki/o2` → **Settings** → **Pages** → Source «Deploy from a
   branch» → Branch `main`, Ordner `/ (root)` → **Save**.
2. DNS für wicki.aero (Cloudflare → wicki.aero → DNS → Add record):
   Type `CNAME`, Name `o2`, Target `bwicki.github.io`, Proxy **aus** (graue Wolke).
3. Zurück in Settings → Pages: Custom domain `o2.wicki.aero` → **Save**. Nach
   «DNS check successful» **Enforce HTTPS** einschalten (kann einige Minuten dauern).
4. Prüfung: https://o2.wicki.aero zeigt die Beispielwerte und in der Kopfzeile
   die Versionsnummer. Nach einer Änderung steht in der Zeile «Meine
   Berechnung» «nur auf diesem Gerät» — das ist richtig, solange Teil 2 fehlt.

## 2 Speicher-Server (Cloudflare Worker)

1. Cloudflare-Dashboard → **Account-ID** kopieren (Workers & Pages, rechte Spalte).
2. API-Token: My Profile → API Tokens → Create Token → Vorlage **Edit Cloudflare
   Workers** → Continue → Create Token. Das Token wird nur einmal gezeigt.
3. Repository `bwicki/o2` → Settings → Secrets and variables → Actions → **New
   repository secret**, zweimal:
   - Name `CLOUDFLARE_API_TOKEN`, Wert: das Token
   - Name `CLOUDFLARE_ACCOUNT_ID`, Wert: die Account-ID
4. Repository → **Actions** → links «Setup worker» → rechts **Run workflow** →
   `api_base` auf `auto` lassen → grüner Knopf **Run workflow**.
5. Der Lauf dauert 1–2 Minuten: Er legt den KV-Namespace `o2-calcs` an, deployt
   den Worker `o2-api`, prüft ihn und trägt seine Adresse in `js/config.js` ein
   (Commit «Setup worker: KV-Namespace, apiBase»).
6. Prüfung: https://o2.wicki.aero neu laden, einen Wert ändern — in der Zeile
   «Meine Berechnung» steht «gespeichert». Dieselbe Adresse auf einem zweiten
   Gerät zeigt denselben Stand.

Bricht der Lauf ab, steht die Ursache rot im Protokoll (meist ein fehlendes
Secret). Der Workflow ist wiederholbar.

## Aufbewahrung und Kosten

Jede Änderung verlängert die Aufbewahrung um 183 Tage; danach löscht Cloudflare
den Eintrag selbst. Gespeichert werden nur Rechenwerte, keine Personendaten.
Das kostenlose Cloudflare-Kontingent (1000 Schreibvorgänge und 100 000
Lesevorgänge pro Tag) reicht für diese Nutzung.

## Später

Änderungen unter `worker/` deployt der Workflow «Deploy worker» von selbst.
Änderungen an der App sind 1–2 Minuten nach dem Commit auf o2.wicki.aero sichtbar.
