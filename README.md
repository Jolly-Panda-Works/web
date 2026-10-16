# 🐼 Jolly Panda Web

Website-design services site of [Jolly Panda Studio](https://jollypanda.ir) — the full price list, selectable packages, a request form and a portfolio. Built with the same stack and look as the main site: plain HTML, CSS and JavaScript, bilingual (English LTR · Persian RTL), no frameworks.

## What it does

- **Home** — walks the visitor through the questions *why a website? · what if I don't have one? · why Jolly Panda? · how is a site made? · how much?* and ends with a guide button to the packages and the form.
- **Packages** — the exact price list from the PowerPoint (6 website types × Economy / Special / Custom). Prices are in **US dollars** (regular price + discount label, cents like `24.99`; `discountPercent` in `data/plans.json` is the default for everything, and a `discount` field on a plan, a type or a single type×plan row overrides it — most specific wins, `0` = no discount); on the **Persian** pages they are shown in **Rial**, converted with the live rate. The **last update date** is shown in both languages (Jalali calendar in Persian).
- **Custom package ("build your own")** — on its own page (`custom.html`, linked from the Packages page) the visitor can skip the plans and pick, one by one, the features the website needs (`data/custom.json`: 4 options — pages, design, SEO, support — plus 33 features in 5 groups; some features need others and add them automatically). A live **approximate price range** is shown — US dollars in English, **Toman** in Persian (USD × the same rate as the Rial prices ÷ 10) — with **no discount**, and a note that it is approximate and the final price is set in the meeting. Edit the catalog and prices in `data/custom.json` (`usd` per item, `range` = low/high multipliers and rounding). The request uses the same form; it sends **two emails in the language of the page** (studio notice + pre-contract to the visitor) from `email-templates/*-custom*.html`. Custom requests need the single generic EmailJS template (see Setup, step 2); without it the visitor's mail app opens.
- **Price-list brochure (PDF)** — the Packages page offers a PDF brochure in **Persian** (prices in Rial) and **English** (US dollars), in the same design as the PowerPoint template in `brochure/`. A GitHub Action rebuilds the two PDFs (`scripts/make-brochure.py`: python-pptx + LibreOffice) whenever the rate, `data/plans.json` or the template change, and commits them to `downloads/`. Each PDF shows the regular price struck through, the discounted price, the discount label and the last-update date. To change its design, edit the template in PowerPoint but keep its structure (9 slides, same shape names, tables with the same rows/columns).
- **Request form** — the selected package is attached to the request. On send, two emails go out: the request to the studio, and a confirmation to the visitor with an **English pre-contract** pre-filled from their request.
- **Portfolio** — searchable, filterable by website type; every project has its own page (`project-detail.html?id=…`) in the same style as the main site.
- **One page per website type** (`services/<slug>.html`, 6 × 2 languages) with plans, prices, FAQ and links, and **one static page per portfolio project** (`projects/<id>.html`).
- **Search and AI visibility:** all prices, plans and content are written into the HTML at build time (no JavaScript needed to read them), JSON-LD (Organization, Service/Offer, FAQPage, BreadcrumbList), sitemap with hreflang, robots.txt that welcomes AI search crawlers — see [`docs/SEO.fa.md`](docs/SEO.fa.md).
- Footer links back to the main site, [jollypanda.ir](https://jollypanda.ir).

## How the Rial price works

```
GitHub Action (once a day at 08:00 Tehran; retry at 20:00 only if the morning call failed)
  └─ scripts/fetch-rate.mjs  → Navasan API (key = repository secret) → data/rate.json
  └─ commit → Vercel builds (scripts/build-pages.mjs) and deploys
Browser (Persian page): price_rial = price_usd × data/rate.json.rateRial   (Navasan Toman × 10 = Rial)
```

The API key never reaches the browser. If the API fails, the last good rate stays in `data/rate.json`; with no rate at all, Persian pages fall back to dollars with a notice.

## Setup (once)

Hosted on **Vercel** (auto-deploys on every push to `main`; `vercel.json` sets the build). Step-by-step guide in Persian: [`docs/VERCEL.fa.md`](docs/VERCEL.fa.md).

1. **Vercel:** import the repo — nothing to change in the import screen.
2. **Email (EmailJS):** create the two templates from [`email-templates/`](email-templates/README.md), then create **one** generic EmailJS template (body `{{{message_html}}}` — fits the free plan) and add `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_TEMPLATE_ID` as Vercel environment variables and **redeploy**. Until then the form falls back to opening the visitor's mail app.
3. **Rial prices:** add the repository secret `NAVASAN_API_KEY` (key from [navasan.tech](https://www.navasan.tech/webserviceguide/)); optional variables `NAVASAN_ITEM` (default `usd_sell`) and `NAVASAN_UNIT` (`toman` by default — Navasan quotes the dollar in Toman, the site multiplies by 10 to get Rial; use `rial` only if the number you get is already in Rial). Allow *Read and write* workflow permissions, then run **Update USD rate** once from the Actions tab.
4. Set `SITE_URL` (your final domain) in Vercel, or edit `siteUrl` in `site.config.json`.

## Everyday editing

| To change… | Edit | Then |
|---|---|---|
| Prices / plan text | `data/plans.json` | commit (rebuilds automatically) |
| Custom package features / prices | `data/custom.json` (+ names in both languages) | commit |
| Portfolio | `data/projects.json` (+ images in `assets/projects/`) | commit |
| Page text | `lang/en.json`, `lang/fa.json` | `node scripts/build-pages.mjs`, commit |
| Page layout | `templates/*.html` | `node scripts/build-pages.mjs`, commit |
| Domain, emails | `site.config.json` | `node scripts/build-pages.mjs`, commit |

`index.html`, `packages.html`, `projects.html`, `services/*`, `projects/*`, `fa/*`, `404.html`, `js/config.js`, `sitemap.xml`, `robots.txt` and `manifest.json` are **generated** — edit the sources above instead.

Local preview: `node scripts/build-pages.mjs && node scripts/serve.mjs` → http://localhost:8080 (Persian: `/fa/`). Needs Node 18+, no installs. Data checks: `node scripts/check.mjs`.

## Structure

```
templates/        page templates + shared partials
lang/             en.json, fa.json (all UI text)
data/             plans.json (price list) · projects.json · rate.json (written by the Action)
scripts/          build-pages · fetch-rate · check · assemble-site · serve
email-templates/  EmailJS HTML (studio notification, customer pre-contract)
css/ js/ assets/  styles (shared with the main site's design tokens), scripts, images
vercel.json  Vercel build settings
.github/workflows/update-rate.yml  daily USD rate (commit -> Vercel deploys) · check.yml  PR checks
```

Copyright © Jolly Panda Studio. All rights reserved.
