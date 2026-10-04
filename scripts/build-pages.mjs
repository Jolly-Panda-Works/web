#!/usr/bin/env node
/* ==========================================================================
   Jolly Panda Web — build-pages.mjs
   Renders templates/*.html into the static English (root) and Persian (/fa/)
   pages, bakes the text from lang/{en,fa}.json into the HTML (so crawlers and
   no-JS visitors see real content), and generates js/config.js, sitemap.xml,
   robots.txt and manifest.json from site.config.json.

   Run:  node scripts/build-pages.mjs      (Node 18+, no dependencies)

   Edit templates/, lang/ or site.config.json — not the generated HTML.
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => path.join(ROOT, ...a);
const read = (f) => fs.readFileSync(p(f), "utf8");
const write = (f, s) => { fs.mkdirSync(path.dirname(p(f)), { recursive: true }); fs.writeFileSync(p(f), s); };

const cfg = JSON.parse(read("site.config.json"));
// Environment variables (e.g. set in the Vercel dashboard) override site.config.json, so the
// EmailJS IDs and the domain can be configured without editing or committing any file:
//   SITE_URL, CONTACT_EMAIL, EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY,
//   EMAILJS_STUDIO_TEMPLATE_ID, EMAILJS_CONFIRM_TEMPLATE_ID
const env = process.env;
if (env.SITE_URL) cfg.siteUrl = env.SITE_URL;
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
const SITE = cfg.siteUrl.replace(/\/+$/, "");

const PAGES = { home: "index.html", packages: "packages.html", projects: "projects.html", projectDetail: "project-detail.html" };
// pages that search engines should index (the project page is filled from ?id=, so it is noindex and not in the sitemap)
const INDEXED = ["home", "packages", "projects"];
const LANGS = ["en", "fa"];

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
};
const icon = (n) => {
  if (!ICONS[n]) throw new Error("Unknown icon: " + n);
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
};

const dirIcon = () => `<span aria-hidden="true" class="dir-icon"><svg class="dir-icon__ltr" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg><svg class="dir-icon__rtl" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg></span>`;

/* ---------- URLs ---------- */
const pageUrl = (lang, page) => {
  const base = lang === "fa" ? `${SITE}/fa/` : `${SITE}/`;
  return page === "home" ? base : base + PAGES[page];
};

/* ---------- discount: row > type > plan > global (same rule as js/pricing.js) ---------- */
function discountPct(ty, pl) {
  for (const v of [ty.rows?.[pl.id]?.discount, ty.discount, pl.discount, plans.discountPercent]) {
    if (v !== undefined && v !== null) { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 100 ? n : 0; }
  }
  return 0;
}
const discountedPrice = (ty, pl) => Math.round(ty.rows[pl.id].price * (100 - discountPct(ty, pl)) / 100);

/* ---------- structured data ---------- */
function jsonLd(lang, page) {
  const dict = dicts[lang];
  const org = {
    "@type": "Organization", "@id": `${SITE}/#organization`, name: "Jolly Panda Studio",
    url: cfg.mainSiteUrl, logo: `${SITE}/assets/logo/jolly-panda-paw-icon.png`,
    sameAs: Object.values(cfg.social),
  };
  const site = {
    "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: cfg.siteName.en,
    publisher: { "@id": `${SITE}/#organization` }, inLanguage: ["en", "fa"],
  };
  const web = {
    "@type": "WebPage", "@id": pageUrl(lang, page) + "#webpage", url: pageUrl(lang, page),
    name: dict.pages[page].title, description: dict.pages[page].description,
    isPartOf: { "@id": `${SITE}/#website` }, inLanguage: lang,
  };
  const graph = [org, site, web];
  if (page === "packages") {
    graph.push({
      "@type": "Service", "@id": `${SITE}/#web-design`, serviceType: "Website design and development",
      provider: { "@id": `${SITE}/#organization` },
      hasOfferCatalog: {
        "@type": "OfferCatalog", name: dict.pages.packages.title,
        itemListElement: plans.types.flatMap((ty) => plans.plans.map((pl) => ({
          "@type": "Offer", name: `${ty.name[lang]} — ${pl.name[lang]}`,
          price: discountedPrice(ty, pl), priceCurrency: "USD",
        }))),
      },
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");
}

/* ---------- rendering ---------- */
function include(tpl) {
  return tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => include(read(`templates/partials/${n}.html`)));
}

function render(page, lang) {
  const dict = dicts[lang];
  const rootRel = lang === "fa" ? "../" : "";
  const file = PAGES[page];
  const other = lang === "fa" ? "en" : "fa";
  const vars = {
    lang, dir: dict.meta.dir, root: rootRel, file, page,
    title: esc(dict.pages[page].title), description: esc(dict.pages[page].description), keywords: esc(dict.pages[page].keywords),
    canonical: pageUrl(lang, page), url_en: pageUrl("en", page), url_fa: pageUrl("fa", page),
    og_locale: lang === "fa" ? "fa_IR" : "en_US", og_locale_alt: other === "fa" ? "fa_IR" : "en_US",
    site_url: SITE, site_name: esc(dict.brand.name), main_site: cfg.mainSiteUrl,
    robots: INDEXED.includes(page) ? "index, follow, max-image-preview:large" : "noindex, follow",
    nav_home: page === "home" ? " is-active" : "", nav_packages: page === "packages" ? " is-active" : "", nav_projects: (page === "projects" || page === "projectDetail") ? " is-active" : "",
    aria_home: page === "home" ? ' aria-current="page"' : "", aria_packages: page === "packages" ? ' aria-current="page"' : "", aria_projects: page === "projects" ? ' aria-current="page"' : "",
    en_active: lang === "en" ? " is-active" : "", fa_active: lang === "fa" ? " is-active" : "",
    en_pressed: lang === "en" ? "true" : "false", fa_pressed: lang === "fa" ? "true" : "false",
    telegram: cfg.social.telegram, linkedin: cfg.social.linkedin, github: cfg.social.github,
    contact_email: cfg.contactEmail, jsonld: jsonLd(lang, page), dir_icon: dirIcon(),
  };

  let html = include(read(`templates/${PAGES[page]}`));
  html = html.replace(/\{\{icon:([\w-]+)\}\}/g, (_, n) => icon(n));
  html = html.replace(/\{\{t:([\w.]+)\}\}/g, (_, k) => {
    const v = getPath(dict, k);
    if (typeof v !== "string") throw new Error(`[${lang}/${page}] missing i18n key in {{t:}}: ${k}`);
    return esc(v);
  });
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`[${lang}/${page}] unknown placeholder {{${k}}}`);
    return vars[k];
  });

  // data-i18n="key"  ->  element text is replaced by the dictionary value
  html = html.replace(/<([a-zA-Z0-9]+)([^<>]*?)\sdata-i18n="([^"]+)"([^<>]*)>([\s\S]*?)<\/\1>/g, (m, tag, a, key, b) => {
    const v = getPath(dict, key);
    if (typeof v !== "string") throw new Error(`[${lang}/${page}] missing i18n key: ${key}`);
    return `<${tag}${a} data-i18n="${key}"${b}>${esc(v)}</${tag}>`;
  });
  // data-i18n-attr="alt:key|placeholder:key"
  html = html.replace(/<([a-zA-Z0-9]+)((?:\s[^<>]*?)?\sdata-i18n-attr="([^"]+)"[^<>]*?)(\s*\/?)>/g, (m, tag, attrs, spec, close) => {
    let out = attrs;
    for (const pair of spec.split("|")) {
      const i = pair.indexOf(":"); const attr = pair.slice(0, i); const key = pair.slice(i + 1);
      const v = getPath(dict, key);
      if (typeof v !== "string") throw new Error(`[${lang}/${page}] missing i18n key (attr): ${key}`);
      out = out.replace(new RegExp(`\\s${attr}="[^"]*"`), "") + ` ${attr}="${esc(v)}"`;
    }
    return `<${tag}${out}${close}>`;
  });

  const banner = `<!-- GENERATED by scripts/build-pages.mjs from templates/${PAGES[page]} + lang/${lang}.json — edit those, not this file. -->\n`;
  return html.replace(/^(<!DOCTYPE html>\s*)/i, `$1${banner}`);
}

/* ---------- run ---------- */
let count = 0;
for (const lang of LANGS) {
  for (const page of Object.keys(PAGES)) {
    write((lang === "fa" ? "fa/" : "") + PAGES[page], render(page, lang));
    count++;
  }
}

// The three e-mail bodies, embedded for the browser: with the single EmailJS template (templateId) the page
// fills them in and sends the finished HTML as {{{message_html}}}.
const mailFile = (f) => fs.readFileSync(p("email-templates", f), "utf8");
write("js/email-templates.js",
`/* GENERATED by scripts/build-pages.mjs from email-templates/*.html — do not edit. */
window.JP_EMAIL_TEMPLATES = ${JSON.stringify({
  studio: mailFile("studio-notification.html"),
  customer_en: mailFile("customer-confirmation-precontract.html"),
  customer_fa: mailFile("customer-confirmation-precontract.fa.html"),
})};
`);

// 404 page (single bilingual page; <base href> makes its asset links work at any URL depth)
write("404.html", read("templates/404.html").replace(/\{\{site_url\}\}/g, SITE));

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
}, null, 2)};
`);

// sitemap
const today = new Date().toISOString().slice(0, 10);
const urls = [];
for (const page of INDEXED) for (const lang of LANGS) {
  urls.push(`  <url>
    <loc>${pageUrl(lang, page)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page === "projects" ? "monthly" : "weekly"}</changefreq>
    <priority>${page === "home" ? "1.0" : "0.8"}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl("en", page)}" />
    <xhtml:link rel="alternate" hreflang="fa" href="${pageUrl("fa", page)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("en", page)}" />
  </url>`);
}
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
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
console.log(`Built ${count} pages + 404.html, config.js, sitemap.xml, robots.txt, manifest.json  (site: ${SITE})`);
