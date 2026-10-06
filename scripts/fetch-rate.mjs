#!/usr/bin/env node
/* ==========================================================================
   Jolly Panda Web — fetch-rate.mjs
   Fetches the USD -> Iranian Rial rate from the Navasan web service
   (https://www.navasan.tech/webserviceguide/) and writes data/rate.json.
   Runs inside the GitHub Action (the API key stays a repository secret and
   the plain-HTTP API is only called server-side, never from a visitor's browser).

   Environment:
     NAVASAN_API_KEY   (required)  your Navasan API key
     NAVASAN_ITEM      (optional)  Navasan item to use, default "usd_sell"
                                   (e.g. usd_buy, harat_naghdi_sell, mex_usd_sell)
     NAVASAN_UNIT      (optional)  unit of the number the API returns: "toman" (default — Navasan
                                   quotes the dollar in Toman, e.g. 268800) or "rial". Toman x 10 = Rial.
                                   (Navasan's own docs example shows "11270" for the dollar on 1398-06-20,
                                   when it traded around 11,000 Toman — i.e. Toman.)
     SKIP_IF_UPDATED_TODAY (optional) "true" = do nothing when data/rate.json was
                                   already refreshed today (Asia/Tehran date). The
                                   scheduled workflow runs twice a day with this flag, so
                                   the 2nd run (12 h later) only calls the API again if
                                   the 1st one failed.

   Exit codes: 0 = rate.json written, or the old file was deliberately kept
               because the API failed (the site then shows the last good rate);
               never writes a broken or empty rate.
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "rate.json");

const key = process.env.NAVASAN_API_KEY;
const item = process.env.NAVASAN_ITEM || "usd_sell";
const unit = (process.env.NAVASAN_UNIT || "toman").toLowerCase();
const skipIfToday = String(process.env.SKIP_IF_UPDATED_TODAY).toLowerCase() === "true";

function keepOld(reason) {
  console.warn(`::warning title=USD rate not updated::${reason} — keeping the previous data/rate.json`);
  process.exit(0);
}

// Tehran calendar day, e.g. "2026-10-03"
const tehranDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);

if (skipIfToday && fs.existsSync(OUT)) {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
    // a rate stored with a different unit setting is wrong -> never skip, fetch again
    if (prev.rateRial && prev.fetchedAt && prev.sourceUnit === unit && tehranDay(new Date(prev.fetchedAt)) === tehranDay(new Date())) {
      console.log(`Rate already updated today (${prev.fetchedAt}) — skipping the API call.`);
      process.exit(0);
    }
  } catch { /* unreadable file -> fetch again */ }
}

if (!key) keepOld("NAVASAN_API_KEY secret is not set");
if (!["toman", "rial"].includes(unit)) keepOld(`NAVASAN_UNIT must be "toman" or "rial", got "${unit}"`);

const url = `http://api.navasan.tech/latest/?api_key=${encodeURIComponent(key)}&item=${encodeURIComponent(item)}`;

let body;
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { Accept: "application/json" } });
  if (!res.ok) keepOld(`Navasan answered HTTP ${res.status}`);
  body = await res.json();
} catch (e) {
  keepOld(`request failed (${e.message})`);
}

const entry = body && body[item];
const raw = entry && Number(String(entry.value).replace(/,/g, ""));
if (!entry || !Number.isFinite(raw) || raw <= 0) {
  keepOld(`unexpected response for item "${item}": ${JSON.stringify(body).slice(0, 200)}`);
}

const rateRial = Math.round(unit === "toman" ? raw * 10 : raw);
const sourceTs = Number(entry.timestamp);
const out = {
  base: "USD",
  currency: "IRR",
  rateRial,
  item,
  sourceUnit: unit,
  sourceValue: String(entry.value),
  sourceTimestamp: Number.isFinite(sourceTs) ? sourceTs : null,
  sourceDateJalali: entry.date || null,
  fetchedAt: new Date().toISOString(),
  source: "navasan.tech",
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`USD rate updated: 1 USD = ${rateRial.toLocaleString("en-US")} IRR  (item ${item}, source date ${out.sourceDateJalali || "n/a"})`);
