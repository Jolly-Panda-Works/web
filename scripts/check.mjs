#!/usr/bin/env node
/* ==========================================================================
   Jolly Panda Web — check.mjs
   Fast sanity checks that run in CI before every deploy:
     - lang/en.json and lang/fa.json have exactly the same keys
     - data/plans.json is complete (6 types x 3 plans x all features, bilingual)
       and prices rise Economy < Special < Custom
     - data/projects.json entries are valid and use known website types
     - data/rate.json is either the empty seed or a sane rate
     - site.config.json has the fields the build needs
   Exits with code 1 and a readable list of problems if anything is wrong.
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const errors = [];
const err = (m) => errors.push(m);

const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, p + k + ".") : [p + k]));

// 1. language parity
const en = new Set(flat(json("lang/en.json"))), fa = new Set(flat(json("lang/fa.json")));
for (const k of en) if (!fa.has(k)) err(`lang/fa.json is missing key: ${k}`);
for (const k of fa) if (!en.has(k)) err(`lang/en.json is missing key: ${k}`);

// 2. price list
const plans = json("data/plans.json");
const planIds = plans.plans.map((p) => p.id);
const okPct = (v) => v === undefined || v === null || (Number.isFinite(v) && v >= 0 && v < 100);
if (!okPct(plans.discountPercent)) err("data/plans.json: discountPercent must be a number from 0 to 99");
plans.plans.forEach((p) => { if (!okPct(p.discount)) err(`plan ${p.id}: discount must be a number from 0 to 99`); });
plans.types.forEach((t) => {
  if (!okPct(t.discount)) err(`type ${t.id}: discount must be a number from 0 to 99`);
  for (const [pid, r] of Object.entries(t.rows || {})) if (!okPct(r.discount)) err(`${t.id}/${pid}: discount must be a number from 0 to 99`);
});
const biling = (v, where) => { if (!v || !v.en || !v.fa) err(`${where}: needs both "en" and "fa" text`); };
plans.plans.forEach((p) => biling(p.name, `plan ${p.id} name`));
plans.features.forEach((f) => biling(f.label, `feature ${f.id} label`));
if (plans.types.length !== 6) err(`expected 6 website types, found ${plans.types.length}`);
for (const ty of plans.types) {
  biling(ty.name, `type ${ty.id} name`); biling(ty.title, `type ${ty.id} title`); biling(ty.tagline, `type ${ty.id} tagline`);
  for (const pid of planIds) {
    const row = ty.rows?.[pid];
    if (!row) { err(`type ${ty.id} has no row for plan ${pid}`); continue; }
    for (const f of plans.features) biling(row[f.id], `${ty.id}/${pid}/${f.id}`);
    if (!Number.isFinite(row.price) || row.price <= 0) err(`${ty.id}/${pid}: invalid price`);
  }
  const [a, b, c] = ["economy", "special", "custom"].map((p) => ty.rows?.[p]?.price);
  if (!(a < b && b < c)) err(`type ${ty.id}: prices should rise economy < special < custom (${a}, ${b}, ${c})`);
}

// 3. projects
const typeIds = new Set(plans.types.map((t) => t.id));
const seen = new Set();
for (const p of json("data/projects.json")) {
  if (!p.id) err("a project has no id"); else if (seen.has(p.id)) err(`duplicate project id: ${p.id}`); else seen.add(p.id);
  if (!typeIds.has(p.type)) err(`project ${p.id}: unknown type "${p.type}" (use one of ${[...typeIds].join(", ")})`);
  biling(p.title, `project ${p.id} title`); biling(p.shortDescription, `project ${p.id} shortDescription`);
  if (p.image && !fs.existsSync(path.join(ROOT, p.image))) err(`project ${p.id}: image not found: ${p.image}`);
  for (const l of p.actionLinks || []) if (!/^https?:\/\//.test(l.url || "")) err(`project ${p.id}: actionLinks url must start with http(s)://`);
  for (const g of p.gallery || []) if (!fs.existsSync(path.join(ROOT, g.src))) err(`project ${p.id}: gallery image not found: ${g.src}`);
}

// Persian text must use the Latin brand name, never «جولی پاندا»
const faText = fs.readFileSync(path.join(ROOT, "lang/fa.json"), "utf8") + fs.readFileSync(path.join(ROOT, "data/projects.json"), "utf8") + fs.readFileSync(path.join(ROOT, "data/plans.json"), "utf8");
if (/جولی[\s\u200c]*پاندا/.test(faText)) err("Persian text contains «جولی پاندا» — write «استودیو Jolly Panda» instead");

// e-mail templates: the English pre-contract must contain no Persian, the Persian one must use the Latin brand name
const mail = (f) => fs.readFileSync(path.join(ROOT, "email-templates", f), "utf8");
for (const f of ["customer-confirmation-precontract.html", "studio-notification.html"]) {
  if (/[\u0600-\u06FF]/.test(mail(f))) err(`email-templates/${f} contains Persian text — the English e-mails must be fully English`);
}
if (/جولی[\s\u200c]*پاندا/.test(mail("customer-confirmation-precontract.fa.html"))) err("email-templates/customer-confirmation-precontract.fa.html contains «جولی پاندا» — write «استودیو Jolly Panda»");

// 4. rate
const rate = json("data/rate.json");
if (rate.rateRial != null && !(Number.isFinite(rate.rateRial) && rate.rateRial > 1000)) err(`data/rate.json: rateRial looks wrong (${rate.rateRial})`);

// 5. config
const cfg = json("site.config.json");
for (const k of ["siteUrl", "mainSiteUrl", "contactEmail"]) if (!cfg[k]) err(`site.config.json: missing ${k}`);
if (!/^https?:\/\//.test(cfg.siteUrl || "")) err("site.config.json: siteUrl must start with https://");

if (errors.length) {
  console.error("\nCheck failed:\n" + errors.map((e) => "  ✗ " + e).join("\n") + "\n");
  process.exit(1);
}
console.log(`Check OK — ${plans.types.length} website types x ${planIds.length} plans, ${en.size} text keys, ${seen.size} projects.`);
