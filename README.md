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
| 🚊 Pulse | [`tpg-pulse/`](tpg-pulse/) | Geneva's public transport, live from the [tpg open data](https://opendata.tpg.ch/). Every stop is a dot sized by its monthly boardings — drag through the year and the canton breathes. Then switch to **Rhythm** and the map dissolves: stops re-arrange by the *shape of their year*, so the ones that breathe alike sit together no matter how far apart they are. |
| 🐷 Piggy | [`piggy/`](piggy/) | Shared expenses for two — recurring bills, everyday extras, things booked but not yet paid, and holiday pots, split evenly, by shares or to the cent, with a receipt tallying who owes whom and an itemised log of every repayment between you. Multi-currency, with its own exchange rates. |

## How it's laid out

```
index.html              # the landing page — lists every app
candy-beads/index.html  # one app, one folder, one HTML file
yaniv/index.html
breathing-flow-log/index.html
sensor-readout/index.html
piggy/index.html
tpg-pulse/index.html
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

`piggy/` keeps one `localStorage` key, `piggy.ledger.v1`, holding the whole
book in a flat, relational shape — `people`, `accounts`, `ledgers`, `rules`,
`overrides`, `expenses`, `settlements` — so it maps onto database tables if it
ever grows a backend. Nothing is uploaded and there's no account; **Settings →
Your data** exports the lot as JSON (or a flat CSV of every entry) and imports
it back on another device. **Erase everything** wipes the key.

Amounts are stored as a decimal plus an ISO currency code. A one-off expense
also snapshots the exchange rate it was entered at, so re-reading an old month
never rewrites its numbers; recurring bills use the live rate from settings
instead, so a foreign standing order follows the currency. **Settings →
Currencies → Refresh** pulls rates from `api.frankfurter.dev` — the only
network call the app makes, and everything works with hand-typed rates if it's
blocked.

An expense can be logged before it's paid — a hotel you've booked, a deposit
you owe. Flip **Has it been paid?** to *Still to pay* and it lands in a **Still
to pay** card with its own total and each person's share once it's settled, so
a trip can be budgeted before a franc moves. Planned entries stay out of the
tally, out of *where it went* and out of who-paid-what, because nobody is out of
pocket yet; tapping **Paid** on the row folds it into the real numbers, dating
it today if it was due in the future. A household month shows what's been paid
and what's still planned as separate totals.

Who paid is derived from the account an entry came out of: an account credits
its owners in proportion to their share, so a 50/50 joint account means joint
spending never needs settling. Who owes is the split — evenly, by weighted
shares, or exact amounts, with rounding pennies going to the first person.

Repayments are their own thing, not an edit to any expense. **Settle up** logs
the whole outstanding amount, *Part of it…* logs less than the full amount, and
**＋ Log a repayment** takes an arbitrary one — either direction, any currency,
any date, with a note. Each one records how the money travelled (cash, bank
transfer, Twint or app, or other); the picker sits on the settle-up screen too,
so the one-tap path captures it as well, and it defaults to whatever was used
last. They're all listed under **Repayments**, each tappable to correct or
delete (deleting puts the amount back on the tally), with a per-pair subtotal
once money has moved both ways. The receipt shows a *paid back by* line
per person alongside *paid by*, so the balance at the top is the visible sum of
what each person put in, owes, and has since handed over.

### What Pulse reads, and the trick it plays

`tpg-pulse/` is the only app here with no local state at all — it stores
nothing, and every figure on the page is fetched from the
[Explore v2.1 API](https://opendata.tpg.ch/api/explore/v2.1/console) at
`opendata.tpg.ch` when you open it, straight from the browser. Three datasets:

| Dataset | What it gives Pulse |
| --- | --- |
| `montees-mensuelles-par-arret-par-ligne` | boardings per stop per month — the whole chart |
| `arrets` | the coordinates that turn stop names into a map |
| `frequentation-journaliere-par-tranche-horaire` | the 24-hour clock at the bottom |

It asks each dataset for its *own field list* first and resolves what it needs
by name and type, then builds every query from that — so a renamed column shows
up as a specific message rather than a blank page. The stop reference and the
day-part chart are both optional: lose the coordinates and it falls back to the
rhythm arrangement alone; lose the day-part dataset and that section just
doesn't appear.

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
