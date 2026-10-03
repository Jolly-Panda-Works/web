# 🐼 Jolly Panda Web

Website-design services site of [Jolly Panda Studio](https://jollypanda.ir) — the full price list, selectable packages, a request form and a portfolio. Built with the same stack and look as the main site: plain HTML, CSS and JavaScript, bilingual (English LTR · Persian RTL), no frameworks.

## What it does

- **Home** — walks the visitor through the questions *why a website? · what if I don't have one? · why Jolly Panda? · how is a site made? · how much?* and ends with a guide button to the packages and the form.
- **Packages** — the exact price list from the PowerPoint (6 website types × Economy / Special / Custom). Prices are in **US dollars**; on the **Persian** pages they are shown in **Rial**, converted with the live rate. The **last update date** is shown in both languages (Jalali calendar in Persian).
- **Request form** — the selected package is attached to the request. On send, two emails go out: the request to the studio, and a confirmation to the visitor with an **English pre-contract** pre-filled from their request.
- **Portfolio** — searchable, filterable by website type, details dialog.
- Footer links back to the main site, [jollypanda.ir](https://jollypanda.ir).

## How the Rial price works

```
GitHub Action (once a day at 08:00 Tehran; retry at 20:00 only if the morning call failed)
  └─ scripts/fetch-rate.mjs  → Navasan API (key = repository secret) → data/rate.json
  └─ scripts/build-pages.mjs → index.html, packages.html, projects.html (+ /fa/)
  └─ deploy to GitHub Pages
Browser (Persian page): price_rial = price_usd × data/rate.json.rateRial
```

The API key never reaches the browser. If the API fails, the last good rate stays in `data/rate.json`; with no rate at all, Persian pages fall back to dollars with a notice.

## Setup (once)

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret:** `NAVASAN_API_KEY` (key from [navasan.tech](https://www.navasan.tech/webserviceguide/)). Optional *variables*: `NAVASAN_ITEM` (default `usd_sell`), `NAVASAN_UNIT` (`rial` — default, the service returns Rial — or `toman`).
3. **Email:** follow [`email-templates/README.md`](email-templates/README.md), then fill `email` in `site.config.json`.
4. Edit `site.config.json` (`siteUrl`, `contactEmail`), run `node scripts/build-pages.mjs`, commit, push.
5. Run the workflow once from the **Actions** tab (Run workflow) to fetch the first rate. After that it runs by itself every day.

Persian setup guide: [`docs/SETUP.fa.md`](docs/SETUP.fa.md).

## Everyday editing

| To change… | Edit | Then |
|---|---|---|
| Prices / plan text | `data/plans.json` | commit (rebuilds automatically) |
| Portfolio | `data/projects.json` (+ images in `assets/projects/`) | commit |
| Page text | `lang/en.json`, `lang/fa.json` | `node scripts/build-pages.mjs`, commit |
| Page layout | `templates/*.html` | `node scripts/build-pages.mjs`, commit |
| Domain, emails | `site.config.json` | `node scripts/build-pages.mjs`, commit |

`index.html`, `packages.html`, `projects.html`, `fa/*`, `404.html`, `js/config.js`, `sitemap.xml`, `robots.txt` and `manifest.json` are **generated** — edit the sources above instead.

Local preview: `node scripts/build-pages.mjs && node scripts/serve.mjs` → http://localhost:8080 (Persian: `/fa/`). Needs Node 18+, no installs. Data checks: `node scripts/check.mjs`.

## Structure

```
templates/        page templates + shared partials
lang/             en.json, fa.json (all UI text)
data/             plans.json (price list) · projects.json · rate.json (written by the Action)
scripts/          build-pages · fetch-rate · check · assemble-site · serve
email-templates/  EmailJS HTML (studio notification, customer pre-contract)
css/ js/ assets/  styles (shared with the main site's design tokens), scripts, images
.github/workflows/deploy.yml  rate + build + deploy (daily) · check.yml  PR checks
```

Copyright © Jolly Panda Studio. All rights reserved.
