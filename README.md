# EDS O2 Planning

Oxygen planning for flights with the Mountain High **EDS O2D2-2G**: does the
supply last for the planned flight profile, how large is the reserve, and how
long does it last at the highest altitude level?

**https://o2.wicki.aero** · German and English · open, no login

The app is called "EDS O2-Planung" in German. It is a planning aid. The
pressure gauge in flight and the manufacturer's documentation prevail. The
consumption figures come from Mountain High, not from the author of this app
(see [Data source](#data-source) and [LICENSE](LICENSE)).

## How to use it

1. **Oxygen supply** — per cylinder: number, size in litres and pressure (bar or psi).
2. **Settings** — persons, safety margin, altitude from which oxygen is used
   (metres or feet), residual pressure, climb and descent rates.
3. **Flight profile** — altitude levels (ft/FL or m) with their duration. The
   app adds climb and descent between the levels itself.
4. **Result** — balance (supply, demand, reserve, endurance), chart of altitude
   and remaining supply with the cylinder changes, consumption per level.

Input formats: altitude as `FL120`, `120` or `12000`; below 5000 ft in feet.
Duration as `2:30` or `2.5`. Start altitude as a number in metres; `9000 ft` or
`FL090` switches it to feet.

Further functions:

- **Flight title** (optional) — shown in the window title, on the printout and
  in the list "My calculations" in the menu.
- **Cylinder change plan** — all persons breathe from the same cylinder; the
  cylinders are emptied in the order entered. Each change appears as a dashed
  line with its time in the chart and as a line of text below it.
- **Oxygen rule** — a warning based on AMC1 BOP.BAS.180 (Part-BOP) if the
  profile goes above 13,000 ft pressure altitude without oxygen, or stays
  between 10,000 and 13,000 ft for more than 30 minutes without oxygen (only
  possible if the start altitude is set above these limits). Under BOP.BAS.180
  the pilot-in-command determines when oxygen is needed; the AMC limits apply
  where he or she cannot. The app does not distinguish between crew and
  passengers.
- **Update status** — in flight, enter the time spent at the current level and
  the pressures read off the gauges. The app compares them with the plan,
  derives a consumption factor and recalculates the rest of the flight.
- **Print** — A5 on the left half of an A4 landscape sheet, with crop marks,
  always one page (checked up to 6 cylinders and 12 levels).
- **Reset** — resets the calculation to the example values; the short code is
  kept.
- Light and dark theme, installable as an app, usable offline.

## "My calculation" and its short code

The start address without a code always shows the example values. The first
change creates a calculation of its own with a six-character short code in the
address, for example `o2.wicki.aero/#ABC234`. This address (or the QR code
next to it) always leads back to it, even if others have used the app in the
meantime.

- Anyone who knows the address can open **and change** the calculation. There
  is no password.
- The state is kept on the device and on the storage server. Every change
  extends the retention by 183 days (about 6 months); after that the entry is
  deleted.
- Only calculation values are stored (cylinders, settings, levels, status
  updates) plus the freely chosen title.
- If the server cannot be reached, the app keeps working on the device ("saved
  on this device only"), and the copied link carries the state as an
  attachment.

## "My configuration": personal short code

Supply (1) and settings (2) can be stored under a short code of your own
choice, for example `bwi`: 3 to 20 letters or digits, no password.

- **Save** creates the short code. Each short code is assigned only once.
- **Load** fetches the configuration on any device. The device remembers the
  short code; new calculations then start with your own configuration instead
  of the example values for 1 and 2.
- To change it: load, adjust, save. Saving under a short code that is already
  taken is only possible after it has been loaded on that device. This
  protects against overwriting by accident, not on purpose: anyone who knows
  the short code can load and change the configuration.
- If the entries in 1 or 2 differ from the stored configuration, the button
  **"Update configuration …?"** appears. It saves the current state under the
  same short code.
- The consumption factor from the status update is part of the configuration.
  The flight profile and the title are not.
- Retention: 2 years from the last save or load.

## Hand-over from the Fahrtbriefing app

In the [Fahrtbriefing](https://briefing.wicki.aero) flight-briefing app (gas
balloon flights, panel "Flight profile"), the button "O₂ planning" opens this
app with the altitude profile of the flight. It hands over altitude levels in
ft (pressure altitude) with their duration and a title, as an attachment to the
address: `o2.wicki.aero/#i.<attachment>`. The app creates a new calculation
from it; supply and settings come from your own configuration or from the
example values.

A profile handed over this way already contains climb and descent as partial
steps. The app then adds no transitions of its own and no final descent (this
can be switched back in the flight-profile section).

The briefing app assigns the short code of the calculation and remembers it.
It then shows "Open O₂ planning" (opens the calculation unchanged) and "Send
profile again": this replaces the flight profile and the title of the existing
calculation, while supply and settings are kept.

Format of the attachment: base64url of
`{"v":1,"t":"title","l":[[altitude ft, duration h],…],"s":1,"c":"ABC234"}`;
`s: 1` means "profile without transitions to be added", `c` is the short code
of the calculation (optional). At most 30 levels.

## Data source

The consumption figures are taken from the
[Cylinder Duration Chart](https://www.mhoxygen.com/2016/wp-content/uploads/Cylinder-Duration-Chart-6-2014Rev8md.pdf)
(revision 06/2017) published by **Mountain High Equipment & Supply Company**.
All rights in that chart remain with Mountain High. There is no affiliation
with the manufacturer; it has neither reviewed nor approved this app.

From the chart (content ÷ duration, per person, "EDS" columns):

| Altitude | Delivery | L/h per person |
|---|---|---|
| 10,000 ft | Cannula (modes N, D5, D10) | 16.3 |
| 15,000 ft | Cannula | 33.7 |
| 18,000 ft | Cannula | 43.3 |
| 20,000 ft | Mask (F mode) | 63.2 |
| 25,000 ft | Mask | 96.9 |

## Calculation model

Own derivations and assumptions (not from the manufacturer):

- Linear between the reference points; above FL180 the mask curve applies.
- Continued linearly below 10,000 ft, at least 8 L/h; continued above
  25,000 ft, with a warning.
- No consumption below the start altitude (default 2800 m).
- Climb at 1.5 m/s and descent at 2.0 m/s (adjustable); consumption during a
  transition is averaged over the altitude.
- **Cylinder content** with the real-gas factor of oxygen at 15 °C, referred
  to 1.013 bar and 21 °C. Usable is the content down to the residual pressure
  (default 15 bar).
- **Cylinder change**: the time at which the consumption (without margin)
  reaches the usable content of the cylinders used so far.
- **Demand** = consumption × persons × (1 + safety margin).
  **Endurance** = reserve ÷ consumption at the highest level.
- Status: "sufficient" if the supply also covers the margin; "marginal" if it
  covers only the consumption; "insufficient" below that.

It is not known which F setting (F1–F4) the mask figures of the chart are
based on; the values above FL180 should therefore be read as an approximation.

Code: `js/model.js`. The tests reproduce the manufacturer's chart to within 2 %.

## Structure

| Part | Location |
|---|---|
| App (static, GitHub Pages, domain via `CNAME`) | `index.html`, `css/`, `js/`, `fonts/`, `icons/`, `img/` |
| Calculation model, units | `js/model.js`, `js/units.js` |
| Interface, texts DE/EN, storage | `js/app.js`, `js/i18n.js`, `js/store.js` |
| Version, address of the storage server | `js/version.js`, `js/config.js` |
| Offline use | `sw.js`, `manifest.webmanifest` |
| Storage server (Cloudflare Worker + KV) | `worker/` |
| Tests | `test/` |

The storage server runs at `https://o2-api.balthasar.workers.dev` (check:
`/health`). It is deployed through the workflow "O2 worker" in the repository
[`bwicki/briefing`](https://github.com/bwicki/briefing), because the Cloudflare
credentials are already stored there. Step-by-step setup:
[SETUP.md](SETUP.md). Changes (in German): [CHANGELOG.md](CHANGELOG.md).

## Tests

- `npm test` — calculation model, storage and storage server (also runs on
  every push as the GitHub workflow "Tests").
- `python3 test/ui.smoke.py http://localhost:8080/ <folder>` — interface on
  desktop and phone, printing (needs Playwright; run `npm run serve` first).
- `python3 test/ui.server.py` — two devices and the personal short code
  against a local stand-in server (`node test/dev-api.mjs`).

## Releasing a new version

The app's version number is in `js/version.js`, `sw.js`, `package.json` and
`CHANGELOG.md` and must be the same everywhere (a test checks this). The
storage server has its own version (`worker/package.json`,
`worker/wrangler.toml`); after changes under `worker/`, run the workflow "O2
worker" again.

## Licence

© 2026 Balthasar Wicki, Wicki Aero GmbH. Source code published for inspection,
all rights reserved — see [LICENSE](LICENSE). The underlying data originate
from Mountain High and are excluded from the licence (clause 4). Bundled:
fonts IBM Plex Mono and Inter (SIL OFL 1.1), qrcode-generator (MIT).
