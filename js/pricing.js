/* ==========================================================================
   Jolly Panda Web — pricing.js
   Loads data/plans.json (the price list, in US dollars) and data/rate.json
   (the USD -> IRR rate that the GitHub Action refreshes). Provides:
     JP.pricing.load()            -> Promise<{ plans, rate }>
     JP.pricing.format(usd)       -> { main, was, pct }   main = price after the discount,
                                     was = regular price (only when a discount applies).
                                     Rial in Persian when a rate exists, otherwise USD.
     JP.pricing.node(usd, data)   -> DOM node: struck-through regular price + discounted price (+ label)
     JP.pricing.fillNotes()       -> fills every [data-rate-note] with the "last updated" line
     JP.pricing.fillBanners()     -> fills every [data-discount-banner] ("10% discount on all plans")
   plans.json stores the regular (list) price in USD; plans.discountPercent is taken
   off it: discounted = round(list x (100 - pct) / 100).
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
  function pctOf(data) {
    var p = data && data.plans && Number(data.plans.discountPercent);
    return p > 0 && p < 100 ? p : 0;
  }
  function discounted(usd, data) { return Math.round(usd * (100 - pctOf(data)) / 100); }

  function show(usd, data) {
    if (useRial(data)) return num(Math.round(usd * data.rate.rateRial)) + " " + JP.t("pricing.rialWord");
    return usdText(usd);
  }

  /** main = price to pay (after discount); was = regular price, only when a discount applies. */
  function format(usd, data) {
    var pct = pctOf(data);
    return { main: show(discounted(usd, data), data), was: pct ? show(usd, data) : "", pct: pct };
  }

  /** Plain-text version used in the summary card and selection bar (the discounted price). */
  function plain(usd, data) { return format(usd, data).main; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function discountLabel(data) {
    var pct = pctOf(data);
    return pct ? JP.t("pricing.discountLabel", { pct: num(pct) }) : "";
  }

  /** Struck-through regular price, the discounted price and (optionally) the discount label. */
  function node(usd, data, opts) {
    var f = format(usd, data);
    var wrap = el("span", "price-stack");
    if (f.was) {
      var was = el("s", "price-was", f.was);
      was.setAttribute("aria-label", JP.t("pricing.was") + ": " + f.was);
      wrap.appendChild(was);
    }
    wrap.appendChild(el("span", "price-now" + (opts && opts.cls ? " " + opts.cls : ""), f.main));
    if (f.pct && opts && opts.chip) wrap.appendChild(el("span", "discount-chip", discountLabel(data)));
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

        var extra = null;
        if (JP.lang === "fa") {
          extra = data.rate
            ? JP.t("pricing.noteRate", { rate: num(data.rate.rateRial) })
            : JP.t("pricing.noteNoRate");
        }
        if (extra) {
          var sep = document.createElement("span");
          sep.setAttribute("aria-hidden", "true");
          sep.textContent = "·";
          el.appendChild(sep);
          var note = document.createElement("span");
          note.textContent = extra;
          el.appendChild(note);
        }
      });
    });
  }

  function fillBanners() {
    var nodes = document.querySelectorAll("[data-discount-banner]");
    if (!nodes.length) return Promise.resolve();
    return Promise.all([load(), JP.ready]).then(function (r) {
      var pct = pctOf(r[0]);
      nodes.forEach(function (n) {
        n.textContent = "";
        n.hidden = !pct;
        if (!pct) return;
        n.appendChild(el("span", "discount-chip", discountLabel(r[0])));
        n.appendChild(el("span", "", JP.t("pricing.discountBanner", { pct: num(pct) })));
      });
    });
  }

  JP.pricing = { load: load, format: format, plain: plain, node: node, discounted: discounted, discountPercent: pctOf, discountLabel: discountLabel, usdText: usdText, fillNotes: fillNotes, fillBanners: fillBanners, formatDate: formatDate, number: num };
})();
