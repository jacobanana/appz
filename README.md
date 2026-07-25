# appz

A little shelf of tiny, self-contained single-page web apps, published with GitHub Pages.

**Live site:** https://jacobanana.github.io/appz/

## Apps

| App | Folder | What it is |
| --- | --- | --- |
| 🍬 Beadie | [`candy-beads/`](candy-beads/) | Candy-bead whiteboard — place beads on a hex board, lace the thread bead by bead, tie knots, preview the finished piece in 3D, and get a shopping list of beads + cord length. |

## How it's laid out

```
index.html              # the landing page — lists every app
candy-beads/index.html  # one app, one folder, one HTML file
.nojekyll               # serve files as-is (no Jekyll processing)
.github/workflows/deploy-pages.yml
```

Every app is a single `index.html` with its CSS and JS inline. No build step, no
dependencies to install — the repo root *is* the website.

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
