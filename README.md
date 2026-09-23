# appz

A little shelf of tiny, self-contained single-page web apps, published with GitHub Pages.

**Live site:** https://jacobanana.github.io/appz/

## Apps

| App | Folder | What it is |
| --- | --- | --- |
| 🍬 Beadie | [`candy-beads/`](candy-beads/) | Candy-bead whiteboard — place beads on a hex board, lace the thread bead by bead, tie knots, preview the finished piece in 3D, and get a shopping list of beads + cord length. |
| 🃏 Yaniv Scorekeeper | [`yaniv/`](yaniv/) | Scorekeeper for the card game Yaniv — cut for the deal, log each hand, mark a clean Yaniv or an Asaf catch, track totals to 200, with an AI commentator roasting the table each round. Remembers your house rules, the last line-up and every finished game, with an all-time stats page on top. |
| 🫁 Breathing Flow Log | [`breathing-flow-log/`](breathing-flow-log/) | Peak-flow diary — log the morning and evening blow, see which zone each reading lands in (green / amber / red, worked out from your own best), and follow the trend, the daily swing and the running averages. |
| 📡 Sensor Readout | [`sensor-readout/`](sensor-readout/) | Live motion-sensor instrument panel — strip charts of the accelerometer, gyroscope and compass, an attitude bubble level, peak trackers, an interpreted angle view with a zero reference, and a support check of every motion API the browser exposes. |
| 🚊 Pulse | [`tpg-pulse/`](tpg-pulse/) | Geneva's public transport, live from the [tpg open data](https://opendata.tpg.ch/). Search any stop for its whole counted history and every line that calls there, or any line to see it drawn across the network with all its stops. Underneath, the network as dots sized by monthly boardings — then switch to **Rhythm** and the map dissolves: stops re-arrange by the *shape of their year*, so the ones that breathe alike sit together no matter how far apart they are. |
| 📐 Headboard Bracket | [`headboard-bracket/`](headboard-bracket/) | Parametric designer for a printed saddle bracket that hangs over a headboard and carries a projector. Type your board thickness and lean and the profile redraws — side elevation, plan, and a spinnable 3D preview where the projector swings on its hinge until it fouls the wall or the bracket. Exports a watertight STL and a real STEP solid. |
| ⏱️ Wave Calculator | [`wave-calculator/`](wave-calculator/) | Tempo calculators on one shared BPM — compressor attack and release time constants from note values (with the gain-reduction curve over a bar), note lengths in ms / samples / Hz, delay time, reverb pre-delay and decay, MIDI clock ticks and delay compensation, bars ⇄ time (type on either side), and tempo changes from the current BPM as time-stretch or varispeed pitch. |
| 🥁 BeatMapper | [moved to its own repo →](https://github.com/jacobanana/beat-mapper) | Tempo map from a recording — drop in the audio, let it find every hit, set bar 1 and it follows the beat from there, pinning each beat to a real transient. Loop the part that feels right and it rebuilds the rest to match. Exports a MIDI tempo map (with a click track) or a REAPER project with the audio already in place, slices the audio into samples, and keeps a per-file session so you can pick up where you left off. Now a Vite + TypeScript app at [jacobanana.github.io/beat-mapper](https://jacobanana.github.io/beat-mapper/); [`beat-mapper/`](beat-mapper/) here only redirects there. |
| 🐷 Piggy | [moved to its own repo →](https://github.com/jacobanana/piggy) | Shared expenses for two — recurring bills, everyday extras, things booked but not yet paid, and holiday pots, split evenly, by shares or to the cent, with a receipt tallying who owes whom and an itemised log of every repayment between you. Multi-currency, with its own exchange rates. Now a Vite app at [jacobanana.github.io/piggy](https://jacobanana.github.io/piggy/), with a FastAPI + Postgres backend growing beside it. |

## How it's laid out

```
index.html              # the landing page — lists every app
candy-beads/index.html  # one app, one folder, one HTML file
yaniv/index.html
breathing-flow-log/index.html
sensor-readout/index.html
tpg-pulse/index.html
headboard-bracket/index.html
wave-calculator/              # the one multi-file app: see below
beat-mapper/index.html  # redirect to the app's new home
.nojekyll               # serve files as-is (no Jekyll processing)
.github/workflows/deploy-pages.yml
```

Every app is a single `index.html` with its CSS and JS inline. No build step, no
dependencies to install — the repo root *is* the website. An app may pull a
library off a CDN (three.js, React) but nothing is compiled ahead of time; edit
the file, push, done.

### What Yaniv remembers

The scorekeeper keeps four things in the browser's `localStorage`, all of them
local to that browser profile and never uploaded:

| Key | What's in it |
| --- | --- |
| `yaniv_settings` | House rules — Yaniv threshold, Asaf penalty, halving toggles. |
| `yaniv_roster` | The last table's line-up, so **Same players →** deals the same game again. |
| `yaniv_games` | The last 50 finished games, round by round — this is what **Stats** reads. |
| `yaniv_api_key` | Your Anthropic key for the commentator (see below). |

**Stats** in the header is the all-time page: a leaderboard (games, wins, win
rate, average and best finishes, Yanivs, Asafs, busts), a handful of records,
and the game archive — tap any game to replay its scoreboard and chart. Clear a
single game from the list, clear the whole history from that page, or wipe any
of the stored items individually under **Settings → Saved on this device**.
Every clear takes two taps and can't be undone.

### Yaniv and the AI commentator

`yaniv/` writes its between-round roasts by calling the Claude API straight from
the browser. That needs your own Anthropic API key — paste one under
**Settings → Live commentator** and it's kept in that browser's `localStorage`,
sent only to `api.anthropic.com`. Anyone with access to the browser profile can
read it, so use a key you're happy to rotate. With no key the app falls back to
a set of canned roasts and plays exactly the same.

### What the breathing log remembers

`breathing-flow-log/` keeps one `localStorage` key, `peakflow_log`: an array of
`{date, am, pm}` rows, nothing else. It never leaves the browser — no account,
no sync, no network calls at all. **Clear all readings** at the foot of the page
wipes the key; clearing the browser's site data does the same.

The green / amber / red bands are the common 80% / 50%-of-personal-best
rule of thumb, computed from the highest reading in the log. It's a log, not
medical advice — if there's an action plan with its own numbers, that wins.

### What Piggy remembers

Piggy has moved to [its own repository](https://github.com/jacobanana/piggy) —
same app, now a Vite + TypeScript codebase with a FastAPI + Postgres backend
growing beside it. The GitHub Pages build at
[jacobanana.github.io/piggy](https://jacobanana.github.io/piggy/) stays
frontend-only: one `localStorage` key (`piggy.ledger.v1`), JSON export/import,
nothing uploaded. The full story lives in that repo's README.

### What Pulse reads, and the trick it plays

`tpg-pulse/` is the only app here with no local state at all — it stores
nothing, and every figure on the page is fetched from the
[Explore v2.1 API](https://opendata.tpg.ch/api/explore/v2.1/console) at
`opendata.tpg.ch` when you open it, straight from the browser. Two datasets:

| Dataset | What it gives Pulse |
| --- | --- |
| `montees-mensuelles-par-arret-par-ligne` | boardings per stop **per line** per month — both searchable directories, every stop's and every line's history, and the stops-to-lines relation in both directions |
| `arrets` | the coordinates, commune and Didoc code behind each stop name |

It asks each dataset for its *own field list* first and resolves what it needs
by name and type, then builds every query from that — so a renamed column shows
up as a specific message rather than a blank page. The stop reference is
optional: lose the coordinates and the map half switches off while everything
else keeps working. Group-by queries are asked for at the API's documented
20 000-row ceiling and fall back to paging at 100 if the portal says no.

**Which lines serve a stop.** There's no separate lines-to-stops reference on
the portal, but the monthly boardings dataset carries `ligne` *and* `arret` on
every row — so grouping by line inside one stop is the answer, and it comes with
the passenger numbers attached. That's what the stop page's line list and its
stacked "how the mix shifted" chart are built from: a line appearing, growing or
vanishing at a stop shows up as a band changing thickness.

**And the same relation backwards.** Group by *stop* inside one line and you get
that line's whole call list, which is what the line page is: its stops ranked by
boardings, its month-by-month total, and where its passengers get on over time.
The two pages link into each other — tap a line on a stop page or a stop on a
line page and it opens the other one.

**Drawing a line on the map.** The data says which stops a line calls at but not
in what order, so the route has to be inferred: project the stops onto their own
principal axis for a starting order, then 2-opt until no segment reversal
shortens the walk. On the mock network that cuts the path from 7 674 px to 888.
It's the line's *reach*, not its timetable — a branch or a loop will thread
itself into a shape the real route doesn't take, and the page says so. The dots
are the honest part: those stops really are on that line, and their size really
is how many people boarded there.

**The trick.** Take each stop's last 18 months of boardings and divide by its
own total, so what's left is only the *shape* of its year — a big terminus and a
sleepy village stop become directly comparable. Run a two-component PCA over
those shapes and use the result as x and y. Press **Rhythm** and the dots leave
their coordinates behind and fly to that position instead: stops that fill and
empty at the same times of year end up neighbours, whatever end of the canton
they're at. Dot colour is the first component in both views, which is the point
— on the map those colours look scattered at random, because when a stop is busy
has very little to do with where it is. Click one and dashed threads join it to
the five stops whose year looks most like its own; in map view they run clean
across Geneva.

### What the bracket designer does, and what it keeps

`headboard-bracket/` is a CAD kernel small enough to read. The bracket is one
2D profile — a saddle that grips the board, a shelf cantilevered off it and a
diagonal strut — extruded to the bracket's width, so every question about the
part is a question about that outline. Corners are filleted on the polygon,
with the four that grip the board held square; a keep-out pass then guarantees
no vertex ends up inside the volume the board occupies, whatever the lean.

| It writes | What's in it |
| --- | --- |
| `headboard_bracket_v1` | Every parameter on the page — board, saddle, shelf, lightening, printer, projector. Saved as you type, in that browser only, never uploaded. **Reset to defaults** clears it. |

Both exports come out of the same profile. **STL** is triangles: holes are
stitched into their parent outline with a zero-width bridge, then ear-clipped —
so the perforated tray meshes as one closed shell rather than a lid floating
over a box. **STEP** is a real B-rep solid: the saddle and the strut are unioned
in 2D first (the strut leaves a triangular void, which becomes an inner ring),
and each region is written out as planar faces sharing their edges, so CAD gets
something it can fillet and cut rather than a triangle soup.

The clash test is the other half. The projector rotates about its hinge in the
profile plane, and the page sweeps the tilt half a degree at a time to find the
angle where the body first touches the wall and where it first fouls the bracket
— reported separately, because those two limits move independently as you change
the shelf. In the 3D view you can drag the projector to tilt it and tap any piece
to hide it.

### What BeatMapper hears, and what it keeps

`beat-mapper/` decodes the audio with the browser's own `AudioContext`, then runs
one pass of FFTs over it and keeps four onset detection functions from that pass,
each in three bands (everything, lows, highs): **spectral flux** (new energy in
any bin), **complex domain** (new energy or a phase jump, which also catches soft
pitched notes), **group delay** (every bin points at the instant its energy sits,
after Van Belle 2012) and **energy rise** (loudness jumps only). Pick one in
step 1; the *transientness* curve it produces is drawn under the waveform so you
can see what the markers come from. Each candidate hit is refined down to the
sample where the signal first leaves the noise floor, so a marker sits on the
*attack*, not the peak or the hat that follows it. Sensitivity and a minimum
gap decide which candidates become markers; anything the detector missed you
add or drag yourself.

The beat grid is a list of *pins* — a position in quarter notes tied to a time
in seconds — and the tempo between two pins is whatever makes them line up. Bar
1 is the first pin. **Auto-map** walks outward from the pins you've set with a
tracker that keeps its own smoothed phase and period, so one off-beat hit can't
drag it away, and lands each beat on the transient it chose. **Derive from
loop** trusts a loop you've drawn — the pins inside it, or just its length in
bars — and rebuilds everything outside it from that tempo.

| It writes | What's in it |
| --- | --- |
| `beatmapper:s:<file name>\|<duration in ms>` | One session per audio file: detection settings, hand-added and removed markers, pins, time signature, loop, view and export choices. **No audio.** Saved every 1.5 s while you work and on leaving the page; opening the same file brings it back. |
| `beatmapper:index` | The eight most recent session keys — older ones are dropped. |

All of that stays in that browser's `localStorage`; nothing is uploaded. The
**Save session** button writes the same object to a `.json` file so it can
travel to another device, where you open it first and then the audio.

Three exports, one plan. The MIDI file is a standard type-1 file: a tempo track
of set-tempo and time-signature meta events, optionally a click track of notes
(higher pitch on the downbeat), at 480 ticks per quarter note. The REAPER
project is a `.rpp` with the tempo envelope in place and the audio item at
time zero, zipped with the audio file if you tick **audio**. When the audio
starts before bar 1, both exports either open with a lead-in bar in a matching
time signature or tell you where to trim, your choice.

### How Wave Calculator is put together

`wave-calculator/` breaks the one-file rule on purpose: it's a set of calculators
that share one tempo, and is meant to keep growing, so each calculator is its
own file. Still no build step — they're plain `<script>` tags, which also
means opening `index.html` from disk still works.

```
wave-calculator/
  index.html            # the tempo bar, the tab strip, the script tags
  styles.css
  js/core.js            # shared state + maths: WC.tempo, WC.timing, WC.notes, WC.fmt, WC.modes
  js/ui.js              # small DOM kit the modes build from (fields, selects, tables…)
  js/modes/*.js         # one calculator per file
  js/app.js             # the shell: wires the tempo bar, builds tabs, mounts modes
```

**The tempo lives in exactly one place.** `WC.tempo` is a small observable store
holding BPM, time signature and sample rate; only the bar at the top edits it
(plus the odd "Use this BPM" button). A mode never shows its own BPM box — it
gets a `WC.timing` object handed to `render(t)` whenever the tempo changes,
with `t.note('1/8d')`, `t.samples(ms)`, `t.barMs` and friends. BPM always
counts quarter notes; the time signature only decides how long a bar is.

**Adding a calculator** is one new file in `js/modes/` and one `<script>` tag
(tab order is script order):

```js
WC.modes.register({
  id: 'lfo',                         // URL hash (#lfo) and storage key
  title: 'LFO',                      // tab label
  prefs: { shape: 'sine' },          // its own inputs, saved per mode
  mount(root, { prefs, tempo }) {    // build the DOM once
    return { render(t) { /* redraw for this tempo */ } };
  },
});
```

| It writes | What's in it |
| --- | --- |
| `wave-calculator:tempo` | BPM, time signature, sample rate. |
| `wave-calculator:mode:<id>` | That calculator's own inputs. |
| `wave-calculator:app` | Which tab was open last. |

All in that browser's `localStorage`; nothing is uploaded.

**The compressor maths.** Attack and release are shown as time constants (τ),
which is how most DAW compressors define their knobs: after a step the envelope
covers 63% of the change in τ. The note value you pick *is* τ, so a 1/8 release
at 120 BPM is 250 ms. The plot runs that envelope over a train of hits to
steady state and reports how much gain is recovered before each new hit.

## Adding a new app

1. Create a folder in the repo root, e.g. `my-app/`, containing an `index.html`.
2. Add an entry to the `APPS` array near the bottom of the root `index.html`:

   ```js
   {
     slug: 'my-app',          // folder name — becomes the link
     name: 'My App',
     emoji: '✨',
     desc: 'One or two sentences about what it does.',
     tags: ['toy', 'canvas'],
     thumb: `<svg viewBox="0 0 160 90">…</svg>`,  // inline SVG card art
   }
   ```
3. Push to `main` — the site redeploys automatically.

Opening `index.html` from disk works too, so you can develop without a server.

## Deployment

`.github/workflows/deploy-pages.yml` publishes the repo root to GitHub Pages on
every push to `main`, and can also be run manually from the **Actions** tab
(*Deploy to GitHub Pages → Run workflow*).

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
