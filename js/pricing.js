/* ==========================================================================
   Jolly Panda Web — pricing.js
   Loads data/plans.json (the price list, in US dollars) and data/rate.json
   (the USD -> IRR rate that the GitHub Action refreshes). Provides:
     JP.pricing.load()            -> Promise<{ plans, rate }>
     JP.pricing.pct(type, plan)   -> discount % of one website type x plan (see "discount" below)
     JP.pricing.format(usd, data, pct) -> { main, was, pct }   main = price after the discount,
                                     was = regular price (only when a discount applies).
                                     Rial in Persian when a rate exists, otherwise USD.
     JP.pricing.node(usd, data)   -> DOM node: struck-through regular price + discounted price (+ label)
     JP.pricing.fillNotes()       -> fills every [data-rate-note] with the "last updated" line
     JP.pricing.fillBanners()     -> fills every [data-discount-banner] ("10% discount on all plans")
   plans.json stores the regular (list) price in USD; the discount is taken off it:
   discounted = round(list x (100 - pct) / 100). Discount per item: see "discount" below.
   English always shows US dollars. Persian shows Rial (USD x rate) when the
   rate file holds a valid rate, and falls back to dollars + a notice if not.
   ========================================================================== */
(function () {
  "use strict";

  var JP = (window.JP = window.JP || {});
  var STALE_AFTER_MS = 3 * 24 * 3600 * 1000;
  var cache = null;

  function fetchJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(url + " -> " + res.status);
      return res.json();
    });
  }

  function load() {
    if (cache) return cache;
    cache = Promise.all([
      fetchJson(JP.root + "data/plans.json"),
      fetchJson(JP.root + "data/rate.json").catch(function () { return null; }),
    ]).then(function (r) {
      var rate = r[1];
      var ok = rate && typeof rate.rateRial === "number" && isFinite(rate.rateRial) && rate.rateRial > 0;
      return { plans: r[0], rate: ok ? rate : null };
    });
    return cache;
  }

  var nf = {
    fa: new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }),
    en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
  };
  function num(n) { return nf[JP.lang].format(n); }

  function usdText(usd) {
    return JP.lang === "fa" ? num(usd) + " " + JP.t("pricing.dollarWord") : "$" + num(usd);
  }

  function useRial(data) { return JP.lang === "fa" && data && data.rate; }

  /* ---- discount ----
     data/plans.json holds the regular price. The discount (%) for one website type x plan is the
     first value found, most specific first:
        types[].rows[plan].discount  >  types[].discount  >  plans[].discount  >  discountPercent
     (0 = no discount, also as an override). discounted = round(regular x (100 - pct) / 100). */
  function clean(p) { p = Number(p); return isFinite(p) && p > 0 && p < 100 ? p : 0; }
  function pct(ty, pl, data) {
    var row = ty && ty.rows && ty.rows[pl.id];
    var chain = [row && row.discount, ty && ty.discount, pl && pl.discount, data && data.plans && data.plans.discountPercent];
    for (var i = 0; i < chain.length; i++) if (chain[i] !== undefined && chain[i] !== null) return clean(chain[i]);
    return 0;
  }
  function allPcts(data) {
    var out = [];
    data.plans.types.forEach(function (ty) { data.plans.plans.forEach(function (pl) { out.push(pct(ty, pl, data)); }); });
    return out;
  }
  function discounted(usd, p) { return Math.round(usd * (100 - clean(p)) / 100); }

  function show(usd, data) {
    if (useRial(data)) return num(Math.round(usd * data.rate.rateRial)) + " " + JP.t("pricing.rialWord");
    return usdText(usd);
  }

  /** main = price to pay (after discount); was = regular price, only when a discount applies. */
  function format(usd, data, p) {
    p = clean(p);
    return { main: show(discounted(usd, p), data), was: p ? show(usd, data) : "", pct: p };
  }

  /** Plain-text version used in the summary card and selection bar (the discounted price). */
  function plain(usd, data, p) { return format(usd, data, p).main; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function discountLabel(p) {
    p = clean(p);
    return p ? JP.t("pricing.discountLabel", { pct: num(p) }) : "";
  }

  /** Struck-through regular price, the discounted price and (optionally) the discount label. */
  function node(usd, data, opts) {
    var f = format(usd, data, opts && opts.pct);
    var wrap = el("span", "price-stack");
    if (f.was) {
      var was = el("s", "price-was", f.was);
      was.setAttribute("aria-label", JP.t("pricing.was") + ": " + f.was);
      wrap.appendChild(was);
    }
    wrap.appendChild(el("span", "price-now" + (opts && opts.cls ? " " + opts.cls : ""), f.main));
    if (f.pct && opts && opts.chip) wrap.appendChild(el("span", "discount-chip", discountLabel(f.pct)));
    return wrap;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var locale = JP.lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB";
    try {
      var s = new Intl.DateTimeFormat(locale, {
        dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tehran",
      }).format(d);
      return JP.lang === "en" ? s + " (" + JP.t("pricing.tehranTime") + ")" : s;
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function updatedIso(data) {
    if (data.rate && data.rate.fetchedAt) return data.rate.fetchedAt;
    if (data.plans && data.plans.listUpdated) return data.plans.listUpdated;
    return null;
  }

  function fillNotes() {
    var nodes = document.querySelectorAll("[data-rate-note]");
    if (!nodes.length) return Promise.resolve();
    return Promise.all([load(), JP.ready]).then(function (r) {
      var data = r[0];
      var iso = updatedIso(data);
      var dateText = iso ? formatDate(iso) : null;
      var stale = !iso || Date.now() - new Date(iso).getTime() > STALE_AFTER_MS;

      nodes.forEach(function (el) {
        el.textContent = "";
        el.classList.toggle("rate-note--stale", stale);

        var dot = document.createElement("span");
        dot.className = "rate-note__dot";
        dot.setAttribute("aria-hidden", "true");
        el.appendChild(dot);

        var label = document.createElement("span");
        label.appendChild(document.createTextNode(JP.t("pricing.updated") + ": "));
        var strong = document.createElement("strong");
        strong.textContent = dateText || JP.t("pricing.noDate");
        label.appendChild(strong);
        el.appendChild(label);

      });
    });
  }

  /** "10% discount on all plans" when every price has the same discount, "Up to 15% off" when they differ. */
  function fillBanners() {
    var nodes = document.querySelectorAll("[data-discount-banner]");
    if (!nodes.length) return Promise.resolve();
    return Promise.all([load(), JP.ready]).then(function (r) {
      var all = allPcts(r[0]), max = Math.max.apply(null, all), min = Math.min.apply(null, all);
      nodes.forEach(function (n) {
        n.textContent = "";
        n.hidden = !(max > 0);
        if (!(max > 0)) return;
        n.appendChild(el("span", "discount-chip", discountLabel(max)));
        n.appendChild(el("span", "", JP.t(min === max ? "pricing.discountBanner" : "pricing.discountBannerUpTo", { pct: num(max) })));
      });
      // notes that only make sense while a discount exists
      document.querySelectorAll("[data-discount-note]").forEach(function (n) { n.hidden = !(max > 0); });
    });
  }

  JP.pricing = { load: load, pct: pct, allPcts: allPcts, format: format, plain: plain, node: node, discounted: discounted, discountLabel: discountLabel, usdText: usdText, fillNotes: fillNotes, fillBanners: fillBanners, formatDate: formatDate, number: num };
})();
