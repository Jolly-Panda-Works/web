#!/usr/bin/env node
/* ==========================================================================
   Jolly Panda Web — build-pages.mjs
   Renders templates/*.html into the static English (root) and Persian (/fa/) pages:
     home, packages, portfolio, one page per website type (services/…) and one page per
     portfolio project (projects/…). Text comes from lang/{en,fa}.json; prices, plans, FAQ and
     project content are written INTO the HTML (scripts/lib/static.mjs) so search engines and AI
     crawlers see them without running JavaScript. Also generates js/config.js, js/email-templates.js,
     sitemap.xml, robots.txt and manifest.json.

     Run:  node scripts/build-pages.mjs      (Node 18+, no dependencies)
     Edit templates/, lang/, data/ or site.config.json — not the generated HTML.
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createShop, esc, servicePath } from "./lib/static.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => path.join(ROOT, ...a);
const read = (f) => fs.readFileSync(p(f), "utf8");
const write = (f, s) => { fs.mkdirSync(path.dirname(p(f)), { recursive: true }); fs.writeFileSync(p(f), s); };

const cfg = JSON.parse(read("site.config.json"));
// Environment variables (e.g. set in the Vercel dashboard) override site.config.json:
//   SITE_URL, CONTACT_EMAIL, EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_TEMPLATE_ID,
//   EMAILJS_STUDIO_TEMPLATE_ID, EMAILJS_CONFIRM_TEMPLATE_ID, EMAILJS_CONFIRM_TEMPLATE_ID_FA
const env = process.env;
// Site address: SITE_URL > the Vercel production domain (set automatically by Vercel) > site.config.json
let siteSource = "site.config.json";
if (env.SITE_URL) { cfg.siteUrl = env.SITE_URL; siteSource = "SITE_URL"; }
else if (env.VERCEL_PROJECT_PRODUCTION_URL) { cfg.siteUrl = "https://" + env.VERCEL_PROJECT_PRODUCTION_URL; siteSource = "Vercel production domain"; }
if (env.CONTACT_EMAIL) cfg.contactEmail = env.CONTACT_EMAIL;
cfg.email = cfg.email || {};
if (env.EMAILJS_SERVICE_ID) cfg.email.serviceId = env.EMAILJS_SERVICE_ID;
if (env.EMAILJS_PUBLIC_KEY) cfg.email.publicKey = env.EMAILJS_PUBLIC_KEY;
if (env.EMAILJS_TEMPLATE_ID) cfg.email.templateId = env.EMAILJS_TEMPLATE_ID;
if (env.EMAILJS_STUDIO_TEMPLATE_ID) cfg.email.studioTemplateId = env.EMAILJS_STUDIO_TEMPLATE_ID;
if (env.EMAILJS_CONFIRM_TEMPLATE_ID) cfg.email.confirmTemplateId = env.EMAILJS_CONFIRM_TEMPLATE_ID;
if (env.EMAILJS_CONFIRM_TEMPLATE_ID_FA) cfg.email.confirmTemplateIdFa = env.EMAILJS_CONFIRM_TEMPLATE_ID_FA;

const dicts = { en: JSON.parse(read("lang/en.json")), fa: JSON.parse(read("lang/fa.json")) };
const plans = JSON.parse(read("data/plans.json"));
const projects = JSON.parse(read("data/projects.json"));
let rateData = null;
try { rateData = JSON.parse(read("data/rate.json")); } catch { /* no rate yet: Persian pages show dollars */ }
const SITE = cfg.siteUrl.replace(/\/+$/, "");
const LANGS = ["en", "fa"];
const shop = createShop({ plans, rate: rateData, dicts, projects });

/* ---------- helpers ---------- */
const getPath = (o, k) => k.split(".").reduce((a, x) => (a && typeof a === "object" ? a[x] : undefined), o);
const ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
  code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>',
  language: '<path d="M4 6h9M8.5 4v2M6 6c.6 3 2.5 5.2 5 6.5M12 6c-.7 3.2-3 5.6-6.5 7"/><path d="M13 20l4-9 4 9M14.5 17h5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  rocket: '<path d="M5 15c-1.5 1-2 4-2 6 2 0 5-.5 6-2M14 5c3-3 7-2 7-2s1 4-2 7l-6 6-5-5 6-6z"/><circle cx="15.5" cy="8.5" r="1.3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  home: '<path d="M4 11l8-7 8 7v9H4v-9z"/><path d="M10 20v-6h4v6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
};
const icon = (n) => {
  if (!ICONS[n]) throw new Error("Unknown icon: " + n);
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
};


const dirIcon = () => `<span aria-hidden="true" class="dir-icon"><svg class="dir-icon__ltr" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg><svg class="dir-icon__rtl" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg></span>`;

/* ---------- the pages ----------
   path     = English file, relative to the site root (the Persian copy lives under fa/)
   template = file in templates/
   kind     = which renderer fills the page */
const pageSpecs = [
  { key: "home", kind: "home", path: "index.html", template: "index.html" },
  { key: "packages", kind: "packages", path: "packages.html", template: "packages.html" },
  { key: "custom", kind: "custom", path: "custom.html", template: "custom.html" },
  { key: "projects", kind: "projects", path: "projects.html", template: "projects.html" },
  ...plans.types.map((ty) => ({ key: "service:" + ty.id, kind: "service", path: servicePath(ty), template: "service.html", ty })),
  ...projects.map((pr) => ({ key: "project:" + pr.id, kind: "project", path: `projects/${pr.id}.html`, template: "project.html", pr })),
];

// content date used for <lastmod>: the newest of the price list and the exchange-rate update
const contentDate = [plans.listUpdated, rateData && rateData.fetchedAt].filter(Boolean).map((d) => new Date(d)).filter((d) => !isNaN(d)).sort((a, b) => b - a)[0] || new Date();
const lastmod = contentDate.toISOString().slice(0, 10);

const fileOf = (spec, lang) => (lang === "fa" ? "fa/" : "") + spec.path;
const urlOf = (spec, lang) => {
  if (spec.path === "index.html") return lang === "fa" ? `${SITE}/fa/` : `${SITE}/`;
  return `${SITE}/${fileOf(spec, lang)}`;
};
const depth = (spec) => spec.path.split("/").length - 1;

function metaOf(spec, lang) {
  if (spec.kind === "notfound") return { title: dicts[lang].notFound.metaTitle, description: dicts[lang].notFound.metaDescription, keywords: "" };
  if (spec.kind === "service") return shop.serviceMeta(spec.ty, lang);
  if (spec.kind === "project") return shop.projectMeta(spec.pr, lang);
  const m = dicts[lang].pages[spec.key];
  return { title: m.title, description: m.description, keywords: m.keywords };
}

/* ---------- structured data ---------- */
function orgNode(lang) {
  return {
    "@type": "Organization", "@id": `${SITE}/#organization`, name: "Jolly Panda Studio",
    url: cfg.mainSiteUrl, logo: `${SITE}/assets/logo/jolly-panda-paw-icon.png`,
    sameAs: [cfg.mainSiteUrl, ...Object.values(cfg.social || {})],
    contactPoint: { "@type": "ContactPoint", contactType: "sales", email: cfg.contactEmail, availableLanguage: ["English", "Persian"] },
  };
}
function offerNodes(ty, lang) {
  return plans.plans.map((pl) => {
    const c = shop.cell(ty, pl);
    return {
      "@type": "Offer", name: `${ty.name[lang]} — ${pl.name[lang]}`, price: c.now, priceCurrency: "USD",
      url: `${SITE}/${lang === "fa" ? "fa/" : ""}packages.html?type=${ty.id}&plan=${pl.id}`,
      description: [ty.rows[pl.id].design, ty.rows[pl.id].structure, ty.rows[pl.id].support].map((f) => f[lang]).join("; "),
    };
  });
}
function jsonLd(spec, lang) {
  const dict = dicts[lang], meta = metaOf(spec, lang), url = urlOf(spec, lang);
  const graph = [
    orgNode(lang),
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: cfg.siteName.en, publisher: { "@id": `${SITE}/#organization` }, inLanguage: ["en", "fa"] },
    { "@type": "WebPage", "@id": url + "#webpage", url, name: meta.title, description: meta.description, isPartOf: { "@id": `${SITE}/#website` }, inLanguage: lang, dateModified: contentDate.toISOString() },
  ];
  const crumb = (items) => ({
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, u], i) => ({ "@type": "ListItem", position: i + 1, name, item: u })),
  });
  const home = [dict.nav.home, urlOf(pageSpecs[0], lang)];
  const pk = [dict.nav.packages, urlOf(pageSpecs[1], lang)];
  const pj = [dict.nav.projects, urlOf(pageSpecs[2], lang)];

  if (spec.kind === "packages") {
    graph.push({
      "@type": "Service", "@id": `${SITE}/#web-design`, serviceType: "Website design and development", provider: { "@id": `${SITE}/#organization` },
      hasOfferCatalog: { "@type": "OfferCatalog", name: meta.title, itemListElement: plans.types.flatMap((ty) => offerNodes(ty, lang)) },
    });
    graph.push(crumb([home, pk]));
  } else if (spec.kind === "custom") {
    graph.push(crumb([home, pk, [meta.title, url]]));
  } else if (spec.kind === "service") {
    const ty = spec.ty, offers = offerNodes(ty, lang), prices = offers.map((o) => o.price);
    graph.push({
      "@type": "Service", "@id": url + "#service", name: ty.title[lang], description: ty.tagline[lang], serviceType: ty.title.en,
      provider: { "@id": `${SITE}/#organization` }, inLanguage: lang,
      offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: offers.length, offers },
    });
    graph.push({
      "@type": "FAQPage", "@id": url + "#faq",
      mainEntity: shop.faq(ty, lang).map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
    });
    graph.push(crumb([home, pk, [ty.title[lang], url]]));
  } else if (spec.kind === "projects") {
    graph.push(crumb([home, pj]));
    graph.push({ "@type": "ItemList", itemListElement: projects.map((pr, i) => ({ "@type": "ListItem", position: i + 1, name: pr.title[lang] || pr.title.en, url: urlOf({ path: `projects/${pr.id}.html` }, lang) })) });
  } else if (spec.kind === "project") {
    const pr = spec.pr, link = (pr.actionLinks || [])[0];
    graph.push({
      "@type": "CreativeWork", "@id": url + "#work", name: pr.title[lang] || pr.title.en, description: pr.shortDescription[lang] || pr.shortDescription.en,
      creator: { "@id": `${SITE}/#organization` }, inLanguage: lang, keywords: (pr.tags || []).join(", "),
      ...(pr.year ? { dateCreated: String(pr.year) } : {}), ...(link ? { sameAs: link.url } : {}),
      ...(pr.image ? { image: /^https?:/i.test(pr.image) ? pr.image : `${SITE}/${pr.image}` } : {}),
    });
    graph.push(crumb([home, pj, [pr.title[lang] || pr.title.en, url]]));
  } else if (spec.kind === "home") {
    graph.push({ "@type": "ItemList", name: dict.home.services.title, itemListElement: plans.types.map((ty, i) => ({ "@type": "ListItem", position: i + 1, name: ty.title[lang], url: urlOf({ path: servicePath(ty) }, lang) })) });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");
}

/* ---------- rendering ---------- */
function include(tpl) {
  return tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => include(read(`templates/partials/${n}.html`)));
}

function render(spec, lang) {
  const dict = dicts[lang], other = lang === "fa" ? "en" : "fa", meta = metaOf(spec, lang);
  const kind = spec.kind;
  // The 404 page is served at ANY address (/foo/bar), so its links are absolute from the site root.
  const base = kind === "notfound" ? "/" : "../".repeat(depth(spec));                 // path to the root of THIS language's pages
  const rootRel = kind === "notfound" ? "/" : (lang === "fa" ? "../" : "") + base;    // path to the site root (assets, js, css, data)
  const robots = kind === "notfound" ? "noindex, follow" : "index, follow, max-image-preview:large";
  const navActive = { home: kind === "home", packages: kind === "packages" || kind === "service" || kind === "custom", projects: kind === "projects" || kind === "project" };
  const banner = shop.discountBanner(lang);
  const vars = {
    lang, dir: dict.meta.dir, root: rootRel, base, file: path.basename(spec.path), path: spec.path, page: kind,
    title: esc(meta.title), description: esc(meta.description), keywords: esc(meta.keywords),
    canonical: urlOf(spec, lang), url_en: urlOf(spec, "en"), url_fa: urlOf(spec, "fa"),
    og_locale: lang === "fa" ? "fa_IR" : "en_US", og_locale_alt: other === "fa" ? "fa_IR" : "en_US",
    site_url: SITE, site_name: esc(dict.brand.name), main_site: cfg.mainSiteUrl, robots,
    nav_home: navActive.home ? " is-active" : "", nav_packages: navActive.packages ? " is-active" : "", nav_projects: navActive.projects ? " is-active" : "",
    aria_home: kind === "home" ? ' aria-current="page"' : "", aria_packages: kind === "packages" ? ' aria-current="page"' : "", aria_projects: kind === "projects" ? ' aria-current="page"' : "",
    en_active: lang === "en" ? " is-active" : "", fa_active: lang === "fa" ? " is-active" : "",
    en_pressed: lang === "en" ? "true" : "false", fa_pressed: lang === "fa" ? "true" : "false",
    telegram: cfg.social.telegram, linkedin: cfg.social.linkedin, github: cfg.social.github,
    contact_email: cfg.contactEmail, jsonld: kind === "notfound" ? "" : jsonLd(spec, lang), dir_icon: dirIcon(),
    // pre-rendered content (same markup as the browser scripts draw)
    verification_meta: [
      env.GOOGLE_SITE_VERIFICATION ? `<meta content="${esc(env.GOOGLE_SITE_VERIFICATION)}" name="google-site-verification"/>` : "",
      env.BING_SITE_VERIFICATION ? `<meta content="${esc(env.BING_SITE_VERIFICATION)}" name="msvalidate.01"/>` : "",
    ].filter(Boolean).join("\n"),
    footer_services: shop.footerServices(lang, base, kind === "notfound"),
    static_price_table: kind === "packages" ? shop.priceTable(lang, base) : "",
    static_teaser: kind === "home" ? shop.teaser(lang, base) : "",
    static_services_grid: kind === "home" ? shop.servicesGrid(lang, base) : "",
    static_service_links: kind === "packages" ? shop.serviceLinks(lang, base) : "",
    static_rate_note: shop.rateNote(lang),
    static_discount_banner: banner.html, discount_hidden: banner.hidden ? ' hidden=""' : "",
    static_project_cards: kind === "projects" ? shop.projectCards(lang, rootRel) : "",
    static_project_filters: kind === "projects" ? shop.projectFilters(lang) : "",
    static_projects_count: kind === "projects" ? shop.projectsCount(lang) : "",
    page_content: kind === "service" ? shop.servicePage(spec.ty, lang, base)
      : kind === "project" ? shop.projectPage(spec.pr, lang, { base, rootRel, url: urlOf(spec, lang) }) : "",
  };

  let html = include(read(`templates/${spec.template}`));
  html = html.replace(/\{\{icon:([\w-]+)\}\}/g, (_, n) => icon(n));
  html = html.replace(/\{\{t:([\w.]+)\}\}/g, (_, k) => {
    const v = getPath(dict, k);
    if (typeof v !== "string") throw new Error(`[${lang}/${spec.path}] missing i18n key in {{t:}}: ${k}`);
    return esc(v);
  });
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`[${lang}/${spec.path}] unknown placeholder {{${k}}}`);
    return vars[k];
  });

  // data-i18n="key"  ->  element text is replaced by the dictionary value
  html = html.replace(/<([a-zA-Z0-9]+)([^<>]*?)\sdata-i18n="([^"]+)"([^<>]*)>([\s\S]*?)<\/\1>/g, (m, tag, a, key, b) => {
    const v = getPath(dict, key);
    if (typeof v !== "string") throw new Error(`[${lang}/${spec.path}] missing i18n key: ${key}`);
    return `<${tag}${a} data-i18n="${key}"${b}>${esc(v)}</${tag}>`;
  });
  // data-i18n-attr="alt:key|placeholder:key"
  html = html.replace(/<([a-zA-Z0-9]+)((?:\s[^<>]*?)?\sdata-i18n-attr="([^"]+)"[^<>]*?)(\s*\/?)>/g, (m, tag, attrs, spec2, close) => {
    let out = attrs;
    for (const pair of spec2.split("|")) {
      const i = pair.indexOf(":"); const attr = pair.slice(0, i); const key = pair.slice(i + 1);
      const v = getPath(dict, key);
      if (typeof v !== "string") throw new Error(`[${lang}/${spec.path}] missing i18n key (attr): ${key}`);
      out = out.replace(new RegExp(`\\s${attr}="[^"]*"`), "") + ` ${attr}="${esc(v)}"`;
    }
    return `<${tag}${out}${close}>`;
  });

  const banner2 = `<!-- GENERATED by scripts/build-pages.mjs from templates/${spec.template} + lang/${lang}.json + data/ — edit those, not this file. -->\n`;
  return html.replace(/^(<!DOCTYPE html>\s*)/i, `$1${banner2}`);
}

/* ---------- run ---------- */
let count = 0;
const keep = new Set();
for (const lang of LANGS) {
  for (const spec of pageSpecs) {
    const f = fileOf(spec, lang);
    write(f, render(spec, lang)); keep.add(f); count++;
  }
}
// pages that existed in earlier versions: remove them so they do not linger as stale files
for (const old of ["project-detail.html", "fa/project-detail.html", "js/project-detail.js"]) { try { fs.rmSync(p(old)); } catch { /* not there */ } }
// project / service pages of items that were removed from data/ -> delete their generated files
for (const dir of ["services", "projects", "fa/services", "fa/projects"]) {
  const d = p(dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith(".html") && !keep.has(`${dir}/${f}`)) fs.rmSync(path.join(d, f));
}

// The seven e-mail bodies (3 for ready-made plans + 4 for custom packages), embedded for the browser: with the single EmailJS template (templateId) the page
// fills them in and sends the finished HTML as {{{message_html}}}.
const mailFile = (f) => fs.readFileSync(p("email-templates", f), "utf8");
write("js/email-templates.js",
`/* GENERATED by scripts/build-pages.mjs from email-templates/*.html — do not edit. */
window.JP_EMAIL_TEMPLATES = ${JSON.stringify({
  studio: mailFile("studio-notification.html"),
  customer_en: mailFile("customer-confirmation-precontract.html"),
  customer_fa: mailFile("customer-confirmation-precontract.fa.html"),
  // custom package ("build your own"): both mails follow the language of the page
  studio_custom_en: mailFile("studio-notification-custom.html"),
  studio_custom_fa: mailFile("studio-notification-custom.fa.html"),
  customer_custom_en: mailFile("customer-confirmation-custom.html"),
  customer_custom_fa: mailFile("customer-confirmation-custom.fa.html"),
})};
`);

// 404 page: the full site layout (header, footer), in English; js/notfound.js switches it to Persian for /fa/… addresses
write("404.html", render({ key: "404", kind: "notfound", path: "404.html", template: "404.html" }, "en"));

// Co-founder signature printed in the pre-contract e-mail. E-mail clients need a public https URL, so the image is
// served from this site. Until assets/signature/usef-farahmand.png exists a 1-pixel transparent image is used.
const SIGNATURE_FILE = "assets/signature/usef-farahmand.png";
const signatureUrl = `${SITE}/${fs.existsSync(p(SIGNATURE_FILE)) ? SIGNATURE_FILE : "assets/signature/blank.png"}`;
if (!fs.existsSync(p(SIGNATURE_FILE))) console.warn(`ℹ  No signature image yet (${SIGNATURE_FILE}) — the pre-contract shows the co-founder's name and date without a signature picture.`);

// runtime config for the browser (generated so site.config.json stays the single source of truth)
write("js/config.js",
`/* GENERATED by scripts/build-pages.mjs from site.config.json — do not edit. */
window.JP_CONFIG = ${JSON.stringify({
  siteUrl: SITE, mainSiteUrl: cfg.mainSiteUrl, contactEmail: cfg.contactEmail, email: cfg.email, signatureUrl,
  services: Object.fromEntries(plans.types.map((ty) => [ty.id, servicePath(ty)])),
}, null, 2)};
`);

// sitemap: every page, in both languages, with hreflang alternates
const urls = [];
for (const spec of pageSpecs) for (const lang of LANGS) {
  const priority = spec.kind === "home" ? "1.0" : spec.kind === "service" || spec.kind === "packages" ? "0.9" : spec.kind === "custom" ? "0.8" : spec.kind === "projects" ? "0.7" : "0.6";
  const freq = spec.kind === "service" || spec.kind === "packages" || spec.kind === "home" ? "weekly" : "monthly";
  urls.push(`  <url>
    <loc>${urlOf(spec, lang)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${urlOf(spec, "en")}" />
    <xhtml:link rel="alternate" hreflang="fa" href="${urlOf(spec, "fa")}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf(spec, "en")}" />
  </url>`);
}
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`);

// robots.txt — everything is open; AI *search* crawlers are named on purpose (they are what puts the site into
// ChatGPT / Claude / Perplexity answers). To stop AI *training* only, uncomment the Disallow groups at the bottom.
write("robots.txt", `# ${SITE}
User-agent: *
Allow: /

# AI search / answer crawlers: keep them allowed
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Bingbot
Allow: /

# Training-only crawlers are allowed too. To opt out of model training (this does NOT remove the site from
# AI answers or search), remove the "#" in front of the lines below:
# User-agent: GPTBot
# Disallow: /
# User-agent: ClaudeBot
# Disallow: /
# User-agent: CCBot
# Disallow: /
# User-agent: Google-Extended
# Disallow: /

Sitemap: ${SITE}/sitemap.xml
`);
write("manifest.json", JSON.stringify({
  name: cfg.siteName.en, short_name: cfg.siteName.en, description: dicts.en.pages.home.description,
  start_url: "./", scope: "./", display: "standalone", theme_color: "#fdfaf5", background_color: "#fdfaf5", lang: "en", dir: "ltr",
  icons: [
    { src: "assets/logo/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "assets/logo/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
}, null, 2) + "\n");

const okId = (k) => cfg.email[k] && !String(cfg.email[k]).startsWith("YOUR_");
console.log(`Request notifications go to: ${cfg.contactEmail}${env.CONTACT_EMAIL ? "" : "  (default — set CONTACT_EMAIL in Vercel to receive them at your own address)"}`);
const emailReady = okId("serviceId") && okId("publicKey") && (okId("templateId") || (okId("studioTemplateId") && okId("confirmTemplateId")));
if (!emailReady) console.warn("⚠  EmailJS is NOT configured: the request form will open the visitor's mail app instead of sending emails. See docs/VERCEL.fa.md.");
if (/github\.io|vercel\.app|localhost/.test(SITE)) console.warn(`⚠  The site address is ${SITE} — canonical URLs, hreflang and the sitemap will point there. Set SITE_URL to your real domain in Vercel.`);
console.log(`Built ${count} pages (${pageSpecs.length} x 2 languages) + 404.html, config.js, sitemap.xml (${urls.length} URLs), robots.txt, manifest.json`);
console.log(`Site address: ${SITE}  (from ${siteSource})`);
