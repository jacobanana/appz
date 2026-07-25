# appz

A little shelf of tiny, self-contained single-page web apps, published with GitHub Pages.

**Live site:** https://jacobanana.github.io/appz/

## Apps

| App | Folder | What it is |
| --- | --- | --- |
| 🍬 Beadie | [`candy-beads/`](candy-beads/) | Candy-bead whiteboard — place beads on a hex board, lace the thread bead by bead, tie knots, preview the finished piece in 3D, and get a shopping list of beads + cord length. |
| 🃏 Yaniv Scorekeeper | [`yaniv/`](yaniv/) | Scorekeeper for the card game Yaniv — cut for the deal, log each hand, mark a clean Yaniv or an Asaf catch, track totals to 200, with an AI commentator roasting the table each round. Remembers your house rules, the last line-up and every finished game, with an all-time stats page on top. |

## How it's laid out

```
index.html              # the landing page — lists every app
candy-beads/index.html  # one app, one folder, one HTML file
yaniv/index.html
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
