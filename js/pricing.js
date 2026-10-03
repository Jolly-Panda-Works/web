/* ==========================================================================
   Jolly Panda Web — pricing.js
   Loads data/plans.json (the price list, in US dollars) and data/rate.json
   (the USD -> IRR rate that the GitHub Action refreshes). Provides:
     JP.pricing.load()            -> Promise<{ plans, rate }>
     JP.pricing.format(usd)       -> { main, sub }  (Rial in Persian when a rate exists, otherwise USD)
     JP.pricing.usdText(usd)      -> "$250" / "۲۵۰ دلار"
     JP.pricing.fillNotes()       -> fills every [data-rate-note] with the "last updated" line
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

  /** main = what to show big; sub = small line under it (the dollar equivalent in Persian). */
  function format(usd, data) {
    if (useRial(data)) {
      var rial = Math.round(usd * data.rate.rateRial);
      return {
        main: num(rial) + " " + JP.t("pricing.rialWord"),
        sub: JP.t("pricing.equivalent", { usd: num(usd) }),
        rial: rial,
      };
    }
    return { main: usdText(usd), sub: "", rial: null };
  }

  /** Plain-text version used in the summary card and selection bar. */
  function plain(usd, data) { return format(usd, data).main; }

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

  JP.pricing = { load: load, format: format, plain: plain, usdText: usdText, fillNotes: fillNotes, formatDate: formatDate, number: num };
})();
