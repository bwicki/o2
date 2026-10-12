# Setup — everything in the browser

Two parts: the app (GitHub Pages, repository `bwicki/o2`) and the storage
server for "My calculation" and "My configuration" (Cloudflare). The app
already works after part 1; part 2 makes a short code show the same state on
every device.

Never write keys or passwords into files of the repository, and never pass
them on in a chat.

## 1 App on GitHub Pages

1. Repository `bwicki/o2` → **Settings** → **Pages** → Source "Deploy from a
   branch" → Branch `main`, folder `/ (root)` → **Save**.
2. DNS for wicki.aero (Cloudflare → wicki.aero → DNS → Add record):
   Type `CNAME`, Name `o2`, Target `bwicki.github.io`, Proxy **off** (grey cloud).
3. Back in Settings → Pages: Custom domain `o2.wicki.aero` → **Save**. After
   "DNS check successful", switch on **Enforce HTTPS** (may take a few minutes).
4. Check: https://o2.wicki.aero shows the example values and the version number
   in the header. After a change, the line "My calculation" says "saved on this
   device only" — that is correct as long as part 2 is missing.

## 2 Storage server (Cloudflare Worker)

The Cloudflare credentials are already stored as secrets in the repository
`bwicki/briefing`. The setup therefore runs from there; nothing needs to be
entered in `bwicki/o2`. Prerequisite: `bwicki/o2` is public and contains the
folder `worker/`.

1. Repository `bwicki/briefing` → **Actions** → "O2 worker" on the left →
   **Run workflow** on the right → green button **Run workflow**.
2. The run takes 1–2 minutes: it fetches the source from `bwicki/o2`, runs the
   tests, creates the KV namespace `o2-calcs` (or finds it), deploys the worker
   `o2-api` and checks it. The summary of the run shows the address, normally
   `https://o2-api.<account>.workers.dev`.
3. This address is entered in `bwicki/o2` in `js/config.js` as `apiBase`. As
   long as it is `''`, the app works in device-only mode.
4. Check: reload https://o2.wicki.aero and change a value — the line "My
   calculation" says "saved …". The same address on a second device shows the
   same state.

If the run fails, the cause is shown in red in the log. The workflow can be
repeated and does not touch the worker or the data of the Fahrtbriefing app.

## Retention and cost

- **Calculations:** every change extends the retention by 183 days; after
  that Cloudflare deletes the entry by itself.
- **Personal configurations** (short code of your own choice): 2 years from
  the last save or load.
- Only calculation values, the freely chosen title and the personal
  configuration are stored. No names or other personal data are requested.
- The free Cloudflare allowance (1,000 writes and 100,000 reads per day) is
  sufficient for this use.

## Later

After changes under `worker/`, run the workflow "O2 worker" in the repository
`bwicki/briefing` again. Changes to the app are visible on o2.wicki.aero 1–2
minutes after the commit; a browser that already has the app open may show the
old version for up to about ten minutes (menu → "Reload app (latest version)").
