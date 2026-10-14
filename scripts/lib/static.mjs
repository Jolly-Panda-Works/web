/* ==========================================================================
   Jolly Panda Web — scripts/lib/static.mjs
   Server-side (build-time) renderers for everything that the browser scripts also draw:
   price table, plan cards, discount banner, "last updated" note, service pages, FAQ,
   portfolio cards and project pages. The HTML they produce is the SAME markup as the
   browser scripts build (js/packages.js, js/home.js, js/projects.js), so search engines and
   AI crawlers that do not run JavaScript still see all prices and content, and the page does
   not flicker when the script takes over.

   Prices follow the same rules as js/pricing.js: discount = row > type > plan > global default,
   discounted = round(regular x (100 - pct)) / 100, Persian pages show Rial (USD x rate) when
   data/rate.json has a rate, otherwise dollars.
   ========================================================================== */

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const fmt = (str, vars = {}) => String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const getPath = (o, k) => k.split(".").reduce((a, x) => (a && typeof a === "object" ? a[x] : undefined), o);

/** URL slug of a website-type page: services/<slug>.html */
const SLUGS = {
  blog: "blog-website-design", portfolio: "portfolio-website-design", corporate: "corporate-website-design",
  education: "educational-website-design", news: "news-website-design", store: "online-store-design",
};
export const serviceSlug = (ty) => SLUGS[ty.id] || `${ty.id}-website-design`;
export const servicePath = (ty) => `services/${serviceSlug(ty)}.html`;

export function createShop({ plans, rate, dicts, projects }) {
  const RATE = rate && Number.isFinite(rate.rateRial) && rate.rateRial > 0 ? rate.rateRial : null;
  const D = (lang) => dicts[lang];
  const t = (lang, key, vars) => {
    const v = getPath(dicts[lang], key);
    if (typeof v !== "string") throw new Error(`missing i18n key (${lang}): ${key}`);
    return vars ? fmt(v, vars) : v;
  };
  const pick = (f, lang) => (f ? f[lang] || f.en || "" : "");

  /* ---------------- numbers & money ---------------- */
  const nf0 = { fa: new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }), en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }) };
  const nf2 = {
    fa: new Intl.NumberFormat("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    en: new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
  const num = (n, lang) => nf0[lang].format(n);
  const usdNum = (n, lang) => (Number.isInteger(n) ? num(n, lang) : nf2[lang].format(n));
  const show = (usd, lang) => {
    if (lang === "fa") return RATE ? `${num(Math.round(usd * RATE), "fa")} ${t("fa", "pricing.rialWord")}` : `${usdNum(usd, "fa")} ${t("fa", "pricing.dollarWord")}`;
    return `$${usdNum(usd, "en")}`;
  };

  /* ---------------- discount ---------------- */
  const clean = (p) => { const n = Number(p); return Number.isFinite(n) && n > 0 && n < 100 ? n : 0; };
  const pct = (ty, pl) => {
    for (const v of [ty.rows?.[pl.id]?.discount, ty.discount, pl.discount, plans.discountPercent]) {
      if (v !== undefined && v !== null) return clean(v);
    }
    return 0;
  };
  const discounted = (usd, p) => Math.round(usd * (100 - clean(p))) / 100;
  const cell = (ty, pl) => { const row = ty.rows[pl.id]; const p = pct(ty, pl); return { usd: row.price, pct: p, now: discounted(row.price, p), row }; };
  const allPcts = () => plans.types.flatMap((ty) => plans.plans.map((pl) => pct(ty, pl)));
  const cheapest = (ty) => plans.plans.map((pl) => cell(ty, pl)).sort((a, b) => a.now - b.now)[0];

  /* ---------------- price fragments ---------------- */
  const discountLabel = (p, lang) => (p ? t(lang, "pricing.discountLabel", { pct: num(p, lang) }) : "");
  function stack(usd, p, lang, o = {}) {
    p = clean(p);
    const now = show(discounted(usd, p), lang);
    const was = p ? show(usd, lang) : "";
    return `<span class="price-stack">${was ? `<s class="price-was" aria-label="${esc(t(lang, "pricing.was"))}: ${esc(was)}">${esc(was)}</s>` : ""}` +
      `<span class="price-now${o.cls ? " " + o.cls : ""}">${esc(now)}</span>` +
      `${p && o.chip ? `<span class="discount-chip">${esc(discountLabel(p, lang))}</span>` : ""}</span>`;
  }

  const updatedIso = () => (RATE && rate.fetchedAt) || plans.listUpdated || null;
  function dateText(iso, lang) {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    const s = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tehran" }).format(d);
    return lang === "en" ? `${s} (${t("en", "pricing.tehranTime")})` : s;
  }
  const rateNote = (lang) => {
    const iso = updatedIso(), d = iso ? dateText(iso, lang) : null;
    return `<span class="rate-note__dot" aria-hidden="true"></span><span>${esc(t(lang, "pricing.updated"))}: <strong>${esc(d || t(lang, "pricing.noDate"))}</strong></span>`;
  };
  function discountBanner(lang) {
    const all = allPcts(), max = Math.max(...all), min = Math.min(...all);
    if (!(max > 0)) return { html: "", hidden: true };
    const text = t(lang, min === max ? "pricing.discountBanner" : "pricing.discountBannerUpTo", { pct: num(max, lang) });
    return { html: `<span class="discount-chip">${esc(discountLabel(max, lang))}</span><span>${esc(text)}</span>`, hidden: false };
  }

  const dirIcon = (sm = false, backwards = false) => {
    const fwd = "M5 12h14M13 6l6 6-6 6", back = "M19 12H5M11 6l-6 6 6 6";
    const ltr = backwards ? back : fwd, rtl = backwards ? fwd : back;
    const svg = (cls, d) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none"><path d="${d}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<span class="dir-icon${sm ? " dir-icon--sm" : ""}" aria-hidden="true">${svg("dir-icon__ltr", ltr)}${svg("dir-icon__rtl", rtl)}</span>`;
  };

  /* ---------------- comparison table (packages page) ---------------- */
  function priceTable(lang, base) {
    const hl = plans.highlightPlan;
    const head = plans.plans.map((pl) => {
      const badge = pl.id === hl && pl.badge ? `<span class="th-badge">${esc(pick(pl.badge, lang))}</span>` : "";
      return `<th${pl.id === hl ? ' class="is-highlight"' : ""} scope="col">${esc(pick(pl.name, lang))}${badge}</th>`;
    }).join("");
    const rows = plans.types.map((ty) => {
      const cells = plans.plans.map((pl) => {
        const c = cell(ty, pl);
        const label = t(lang, "packages.cellSelect", { type: pick(ty.name, lang), plan: pick(pl.name, lang) });
        return `<td${pl.id === hl ? ' class="is-highlight"' : ""}><button aria-label="${esc(label)}" class="price-cell" data-plan="${pl.id}" data-type="${ty.id}" type="button">${stack(c.usd, c.pct, lang)}</button></td>`;
      }).join("");
      return `<tr><th scope="row"><a class="price-table__link" href="${base}${servicePath(ty)}">${esc(pick(ty.name, lang))}</a></th>${cells}</tr>`;
    }).join("");
    return `<caption>${esc(t(lang, "packages.compare.caption"))}</caption><thead><tr><th scope="col" style="text-align:start">${esc(t(lang, "packages.compare.typeHeader"))}</th>${head}</tr></thead><tbody>${rows}</tbody>`;
  }

  /* ---------------- home: cost teaser + services grid ---------------- */
  function teaser(lang, base) {
    return plans.plans.map((pl) => {
      let best = null;
      for (const ty of plans.types) { const c = cell(ty, pl); if (!best || c.now < best.now) best = c; }
      const hl = plans.highlightPlan === pl.id;
      return `<article class="teaser-card${hl ? " teaser-card--highlight" : ""}">` +
        (hl && pl.badge ? `<span class="teaser-card__badge">${esc(pick(pl.badge, lang))}</span>` : "") +
        `<h3 class="teaser-card__name">${esc(pick(pl.name, lang))}</h3><p class="teaser-card__desc">${esc(t(lang, "home.q5." + pl.id))}</p>` +
        `<span class="teaser-card__from">${esc(t(lang, "pricing.from"))}</span><div class="teaser-card__price">${stack(best.usd, best.pct, lang, { chip: true })}</div>` +
        `<a class="teaser-card__link" href="${base}packages.html#compare"><span>${esc(t(lang, "home.q5.see"))}</span>${dirIcon(true)}</a></article>`;
    }).join("");
  }

  function servicesGrid(lang, base) {
    return plans.types.map((ty) => {
      const c = cheapest(ty);
      return `<a class="service-card" href="${base}${servicePath(ty)}"><h3>${esc(pick(ty.title, lang))}</h3><p>${esc(pick(ty.tagline, lang))}</p>` +
        `<span class="service-card__from">${esc(t(lang, "pricing.from"))}</span><span class="service-card__price">${stack(c.usd, c.pct, lang, { chip: true })}</span>` +
        `<span class="service-card__link"><span>${esc(t(lang, "home.services.link"))}</span>${dirIcon(true)}</span></a>`;
    }).join("");
  }
  const footerServices = (lang, base, bilingual = false) => plans.types.map((ty) => `<li><a class="site-footer__link" ${bilingual ? `data-en="${esc(ty.title.en)}" data-fa="${esc(ty.title.fa)}" ` : ""}href="${base}${servicePath(ty)}">${esc(pick(ty.title, lang))}</a></li>`).join("");
  const serviceLinks = (lang, base, exceptId) => plans.types.filter((ty) => ty.id !== exceptId)
    .map((ty) => `<li><a class="service-links__item" href="${base}${servicePath(ty)}">${esc(pick(ty.title, lang))}</a></li>`).join("");

  /* ---------------- service (website type) page ---------------- */
  function planCards(ty, lang, base) {
    return plans.plans.map((pl) => {
      const c = cell(ty, pl), hl = pl.id === plans.highlightPlan;
      const feats = plans.features.map((ft) => {
        const label = ft.id === "structure" && ty.structureLabel ? ty.structureLabel : ft.label;
        return `<li><span class="k">${esc(pick(label, lang))}</span><span class="v">${esc(pick(c.row[ft.id], lang))}</span></li>`;
      }).join("");
      return `<article class="plan-card${hl ? " plan-card--highlight" : ""}">${hl && pl.badge ? `<span class="plan-card__badge">${esc(pick(pl.badge, lang))}</span>` : ""}` +
        `<h3 class="plan-card__name">${esc(pick(pl.name, lang))}</h3><div class="plan-card__price"><span class="plan-card__price-label">${esc(t(lang, "pricing.startingPrice"))}</span>${stack(c.usd, c.pct, lang, { chip: true, cls: "plan-card__price-value" })}</div>` +
        `<ul class="plan-card__list">${feats}</ul><a class="btn btn-primary plan-card__btn" href="${base}packages.html?type=${ty.id}&amp;plan=${pl.id}#request">${esc(t(lang, "packages.select"))}</a></article>`;
    }).join("");
  }

  /** {type} (lower-case in English) plus the right article for English: "a blog", "an online store". */
  const typeVars = (name, lang) => {
    const type = lang === "en" ? name.toLowerCase() : name;
    const an = lang === "en" && /^[aeiou]/i.test(type);
    return { type, a: an ? "an" : "a", A: an ? "An" : "A" };
  };
  function faq(ty, lang) {
    const name = pick(ty.name, lang), v = typeVars(name, lang);
    const cells = Object.fromEntries(plans.plans.map((pl) => [pl.id, cell(ty, pl)]));
    const anyDiscount = Object.values(cells).some((c) => c.pct > 0);
    const costVars = {
      ...v,
      economy: show(cells.economy.now, lang), special: show(cells.special.now, lang), custom: show(cells.custom.now, lang),
      economyWas: show(cells.economy.usd, lang), specialWas: show(cells.special.usd, lang), customWas: show(cells.custom.usd, lang),
    };
    const lower = (s) => (lang === "en" ? s.charAt(0).toLowerCase() + s.slice(1) : s);
    const time = (id) => pick(ty.rows[id].delivery, lang);
    const diff = plans.plans.map((pl) => t(lang, "services.faq.diff.line", {
      plan: pick(pl.name, lang), design: lower(pick(ty.rows[pl.id].design, lang)),
      structure: lower(pick(ty.rows[pl.id].structure, lang)), support: lower(pick(ty.rows[pl.id].support, lang)),
    })).join(" ");
    return [
      { q: t(lang, "services.faq.cost.q", v), a: t(lang, anyDiscount ? "services.faq.cost.aDiscount" : "services.faq.cost.a", costVars) },
      { q: t(lang, "services.faq.time.q", v), a: t(lang, "services.faq.time.a", { economy: time("economy"), special: time("special"), custom: time("custom") }) },
      { q: t(lang, "services.faq.diff.q"), a: diff },
      { q: t(lang, "services.faq.domain.q"), a: t(lang, "services.faq.domain.a") },
      { q: t(lang, "services.faq.order.q", v), a: t(lang, "services.faq.order.a") },
    ];
  }
  const faqHtml = (items) => `<div class="faq">${items.map((i) => `<div class="faq__item"><h3>${esc(i.q)}</h3><p>${esc(i.a)}</p></div>`).join("")}</div>`;

  function serviceMeta(ty, lang) {
    const name = pick(ty.name, lang), from = show(cheapest(ty).now, lang);
    const v = { title: pick(ty.title, lang), from, name, days: pick(ty.rows.economy.delivery, lang), tagline: pick(ty.tagline, lang).replace(/[.。]+$/, "") };
    return { title: t(lang, "services.meta.title", v), description: t(lang, "services.meta.description", v), keywords: t(lang, "services.meta.keywords", v) };
  }

  function servicePage(ty, lang, base) {
    const name = pick(ty.name, lang), tv = typeVars(name, lang);
    const c = cheapest(ty), banner = discountBanner(lang), items = faq(ty, lang);
    const inc = ["i1", "i2", "i3"].map((k) => `<li>${checkIcon()}<span>${esc(t(lang, "services.included." + k))}</span></li>`).join("");
    return `
<section class="page-hero page-hero--service">
<div class="container">
<nav aria-label="${esc(t(lang, "services.breadcrumb"))}" class="breadcrumb"><ol>
<li><a href="${base}index.html">${esc(t(lang, "nav.home"))}</a></li>
<li><a href="${base}packages.html">${esc(t(lang, "nav.packages"))}</a></li>
<li aria-current="page">${esc(pick(ty.title, lang))}</li></ol></nav>
<span class="eyebrow page-hero__eyebrow">${esc(name)}</span>
<h1 data-reveal="">${esc(pick(ty.title, lang))}</h1>
<p data-reveal="">${esc(pick(ty.tagline, lang))}</p>
<p class="service-hero__from" data-reveal=""><span>${esc(t(lang, "services.hero.from"))}</span> ${stack(c.usd, c.pct, lang)}</p>
${banner.hidden ? "" : `<p class="discount-banner">${banner.html}</p>`}
<p class="rate-note">${rateNote(lang)}</p>
<div class="service-hero__actions"><a class="btn btn-primary btn--lg" href="${base}packages.html?type=${ty.id}#packages"><span>${esc(t(lang, "services.hero.cta"))}</span>${dirIcon()}</a>
<a class="btn btn-secondary" href="${base}projects.html"><span>${esc(t(lang, "home.hero.ctaSecondary"))}</span></a></div>
</div>
</section>
<section class="section section--tight service-intro"><div class="container"><p class="service-intro__text" data-reveal="">${esc(t(lang, "services.intro." + ty.id))}</p></div></section>
<section class="section section--alt" id="plans"><div class="container">
<div class="section-heading section-heading--center" data-reveal=""><h2>${esc(t(lang, "services.plans.title", tv))}</h2><p>${esc(t(lang, "services.plans.subtitle"))}</p></div>
<div class="plan-grid">${planCards(ty, lang, base)}</div>
<aside class="notes-box" data-reveal=""><h3>${esc(t(lang, "services.included.title"))}</h3><ul class="notes-box__list">${inc}</ul></aside>
</div></section>
<section class="section" id="faq"><div class="container container--narrow">
<div class="section-heading section-heading--center" data-reveal=""><h2>${esc(t(lang, "services.faq.title", tv))}</h2></div>
${faqHtml(items)}
</div></section>
<section class="section section--alt" id="more"><div class="container">
<div class="section-heading section-heading--center" data-reveal=""><h2>${esc(t(lang, "services.related.title"))}</h2></div>
<ul class="service-links">${serviceLinks(lang, base, ty.id)}</ul>
</div></section>
<section class="section" id="cta"><div class="container"><div class="cta" data-reveal="">
<h2>${esc(t(lang, "services.cta.title", tv))}</h2><p>${esc(t(lang, "services.cta.text"))}</p>
<div class="cta__actions"><a class="btn btn-primary btn--lg" href="${base}packages.html?type=${ty.id}#packages"><span>${esc(t(lang, "services.hero.cta"))}</span>${dirIcon()}</a></div>
</div></div></section>`;
  }
  const checkIcon = () => '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';

  /* ---------------- portfolio ---------------- */
  const typeName = (id, lang) => { const ty = plans.types.find((x) => x.id === id); return ty ? pick(ty.name, lang) : t(lang, "projects.other"); };
  const imgSrc = (path, rootRel) => (/^https?:\/\//i.test(path) ? path : rootRel + path);
  const placeholder = (p) => `<div class="cover-ph"><div class="cover-ph__bar"><i></i><i></i><i></i></div><div class="cover-ph__body">${esc(p.domain && p.domain.length <= 24 ? p.domain : pick(p.title, "en"))}</div></div>`;

  function projectCards(lang, rootRel) {
    return projects.map((p) => {
      const title = pick(p.title, lang);
      const cover = p.image ? `<img alt="${esc(title)}" decoding="async" loading="lazy" src="${esc(imgSrc(p.image, rootRel))}"/>` : placeholder(p);
      const tags = (p.tags || []).slice(0, 4).map((x) => `<span class="tag">${esc(x)}</span>`).join("");
      return `<a class="project-card" href="projects/${esc(p.id)}.html"><div class="project-card__media${p.image ? "" : " project-card__media--ph"}">${cover}<span class="project-card__badge">${esc(typeName(p.type, lang))}</span></div>` +
        `<div class="project-card__body"><h3 class="project-card__title">${esc(title)}</h3><p class="project-card__desc">${esc(pick(p.shortDescription, lang))}</p><div class="project-card__tags">${tags}</div>` +
        `<div class="project-card__footer"><span class="project-card__year">${esc(p.year || "")}</span><span class="project-card__link"><span>${esc(t(lang, "projects.viewDetails"))}</span>${dirIcon(true)}</span></div></div></a>`;
    }).join("");
  }
  function projectFilters(lang) {
    const present = new Set(projects.map((p) => p.type));
    const ids = ["all", ...plans.types.map((x) => x.id).filter((id) => present.has(id))];
    return ids.map((id) => `<button aria-pressed="${id === "all"}" class="filter-chip${id === "all" ? " is-active" : ""}" type="button">${esc(id === "all" ? t(lang, "projects.all") : typeName(id, lang))}</button>`).join("");
  }
  const projectsCount = (lang) => (projects.length === 1 ? t(lang, "projects.countOne") : t(lang, "projects.countOther", { count: num(projects.length, lang) }));

  /* ---------------- project page ---------------- */
  function projectPage(p, lang, { base, rootRel, url }) {
    const title = pick(p.title, lang), shortDesc = pick(p.shortDescription, lang), typeLabel = typeName(p.type, lang);
    const links = p.actionLinks || [];
    const linkLabel = (l) => (l.label ? pick(l.label, lang) : t(lang, "projectDetail.actionLinks." + (l.type || "website")));
    const extIcon = '<svg viewBox="0 0 24 24" fill="none"><path d="M14 5h5v5M19 5l-9 9M9 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const actions = (ghost) => links.map((l) => `<a class="action-link${ghost ? " action-link--ghost" : ""}" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank">${extIcon}<span>${esc(linkLabel(l))}</span></a>`).join("");
    const paragraphs = pick(p.fullDescription || p.shortDescription, lang).split(/\n\n+/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join("");
    const hl = (p.highlights && (p.highlights[lang] || p.highlights.en)) || [];
    const check = '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const highlights = hl.length ? `<div class="project-detail__panel" data-reveal=""><h3>${esc(t(lang, "projectDetail.highlightsTitle"))}</h3><ul class="project-detail__list">${hl.map((h) => `<li>${check}<span>${esc(h)}</span></li>`).join("")}</ul></div>` : "";
    const tags = (p.tags || []).length ? `<div class="project-detail__panel" data-reveal=""><h3>${esc(t(lang, "projectDetail.tagsTitle"))}</h3><div class="project-detail__tags" dir="ltr">${p.tags.map((x) => `<span class="project-detail__tag">${esc(x)}</span>`).join("")}</div></div>` : "";

    const message = t(lang, "projectDetail.share.message", { project: title, team: t(lang, "brand.name") });
    const enc = encodeURIComponent;
    const shareBtn = (kind, href, label, svg) => `<a aria-label="${esc(label)}" class="share-btn" data-share="${kind}" href="${esc(href)}" rel="noopener noreferrer" target="_blank">${svg}</a>`;
    const share = `<div class="share-row" data-share-row=""><span class="share-row__label">${esc(t(lang, "projectDetail.share.label"))}</span>` +
      `<button aria-label="${esc(t(lang, "projectDetail.share.copyLink"))}" class="share-btn" data-copied="${esc(t(lang, "projectDetail.share.copied"))}" data-copy="${esc(message + " " + url)}" data-share="copy" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L12.5 19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="share-btn__tooltip" data-share-tooltip="">${esc(t(lang, "projectDetail.share.copyLink"))}</span></button>` +
      shareBtn("twitter", `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(url)}`, t(lang, "projectDetail.share.twitter"), '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 4H5.5l12.2 16z"/></svg>') +
      shareBtn("telegram", `https://t.me/share/url?url=${enc(url)}&text=${enc(message)}`, t(lang, "projectDetail.share.telegram"), '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 4.5L2.9 11.6c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 10.6-6.7c.5-.3 1-.1.6.2l-8.6 7.8h0l-.3 4.6c.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.2c.3-1.3-.5-1.9-1.5-1.7z"/></svg>') +
      shareBtn("linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, t(lang, "projectDetail.share.linkedin"), '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 3.5a1.96 1.96 0 100 3.92 1.96 1.96 0 000-3.92zM20.44 20h-3.37v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.68V8.5h3.24v1.57h.05c.45-.86 1.56-1.76 3.2-1.76 3.43 0 4.06 2.25 4.06 5.18V20z"/></svg>') + "</div>";

    const hasImg = !!p.image;
    const cover = hasImg ? `<img alt="" class="project-hero__cover-img" draggable="false" src="${esc(imgSrc(p.image, rootRel))}"/>` : `<div aria-hidden="true" class="project-hero__ph">${placeholder(p)}</div>`;
    const hero = `<div class="project-hero${hasImg ? "" : " project-hero--ph"}">${cover}<div class="project-hero__scrim"></div>` +
      `<a class="project-hero__back" href="${base}projects.html">${dirIcon(true, true)}<span>${esc(t(lang, "projectDetail.back"))}</span></a>` +
      `<div class="project-hero__overlay"><div class="container"><div data-reveal=""><div class="project-hero__identity"><div><div class="project-hero__meta"><span class="eyebrow">${esc(typeLabel)}</span>${p.year ? `<span class="project-card__year">${esc(p.year)}</span>` : ""}</div>` +
      `<h1 class="project-hero__title">${esc(title)}</h1></div></div><p class="project-hero__desc">${esc(shortDesc)}</p>` +
      `<div class="project-hero__actions-row"><div class="project-hero__links">${actions(true)}</div>${share}</div></div></div></div></div>`;

    const body = `<section class="section section--tight"><div class="container"><div class="project-detail__grid"><div class="project-detail__body" data-reveal="">${paragraphs}</div><div class="project-detail__aside">${highlights}${tags}</div></div></div></section>`;
    const gallery = p.gallery && p.gallery.length
      ? `<section class="section section--tight project-gallery"><div class="container"><h2>${esc(t(lang, "projectDetail.gallery.galleryTitle"))}</h2><div class="project-gallery__scroll">` +
        p.gallery.map((g) => `<a class="gallery-frame" href="${esc(imgSrc(g.src, rootRel))}" rel="noopener" target="_blank"><img alt="${esc(pick(g.caption, lang))}" loading="lazy" src="${esc(imgSrc(g.src, rootRel))}"/></a>`).join("") + "</div></div></section>"
      : "";
    const hasLinks = links.length > 0;
    const dlImg = hasImg ? `<div class="project-download__image" data-reveal=""><img alt="${esc(title)}" draggable="false" src="${esc(imgSrc(p.image, rootRel))}"/></div>` : `<div class="project-download__image project-download__image--ph" data-reveal="">${placeholder(p)}</div>`;
    const download = `<section class="section project-download"><div class="container"><div class="project-download__grid"><div class="project-download__content" data-reveal=""><h2>${esc(t(lang, "projectDetail.download.title"))}</h2><p>${esc(t(lang, hasLinks ? "projectDetail.download.desc" : "projectDetail.download.descFallback"))}</p>` +
      `${hasLinks ? `<div class="project-download__links">${actions(false)}</div>` : ""}<div class="project-download__secondary"><a class="btn btn-primary" href="${base}packages.html#packages" style="color:#fff">${esc(t(lang, "projectDetail.cta.button"))}</a><a href="${base}projects.html">${esc(t(lang, "projectDetail.viewAll"))}</a></div></div>${dlImg}</div></div></section>`;
    return hero + body + gallery + download;
  }
  const projectMeta = (p, lang) => ({
    title: `${pick(p.title, lang)} — ${typeName(p.type, lang)} | ${t(lang, "brand.name")}`,
    description: pick(p.shortDescription, lang),
    keywords: [pick(p.title, lang), ...(p.tags || [])].join(", "),
  });

  return {
    RATE, t, pick, num, show, pct, cell, cheapest, discounted, allPcts, updatedIso, dateText, discountBanner, rateNote,
    priceTable, teaser, servicesGrid, footerServices, serviceLinks, planCards, faq, faqHtml, serviceMeta, servicePage,
    projectCards, projectFilters, projectsCount, projectPage, projectMeta, typeName, dirIcon, stack,
  };
}
