/* ==========================================================================
   Jolly Panda Web — custom.js
   "Build your own package": the visitor picks features one by one (data/custom.json)
   instead of choosing a website type + plan, sees an APPROXIMATE price RANGE and sends
   the request with the same form. No discount is applied to custom packages.
     - English shows US dollars; Persian shows Toman (USD x data/rate.json, Rial / 10),
       falling back to dollars when there is no rate.
     - The range is  [total x range.low , total x range.high]  rounded (see custom.json "range").
   Exposes JP.custom (used by packages.js and form.js) and fires "jp:custom" on every change.
   Lives on its own page (custom.html); JP.mode is always "custom" there.
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var KEY = "jp:custom";
  var cat = null;          // data/custom.json
  var rate = null;         // data/rate.json (or null)
  var state = { features: [], choices: {} };
  JP.mode = JP.mode || "plan";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- catalog helpers ---------- */
  function allFeatures() {
    var out = [];
    cat.groups.forEach(function (g) { g.features.forEach(function (f) { out.push({ group: g, feature: f }); }); });
    return out;
  }
  function featureById(id) {
    var all = allFeatures();
    for (var i = 0; i < all.length; i++) if (all[i].feature.id === id) return all[i].feature;
    return null;
  }
  function optionById(id) { return cat.options.filter(function (o) { return o.id === id; })[0]; }
  function choiceOf(opt) {
    var cid = state.choices[opt.id];
    return opt.choices.filter(function (c) { return c.id === cid; })[0] || opt.choices[0];
  }
  function defaults() {
    var c = {};
    cat.options.forEach(function (o) { c[o.id] = o.choices[0].id; });
    return c;
  }
  function names(ids) { return ids.map(function (id) { return JP.pick(featureById(id).name); }).join(JP.lang === "fa" ? "، " : ", "); }

  /* ---------- persistence ---------- */
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function restore() {
    state = { features: [], choices: defaults() };
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (!s) return;
      state.features = (s.features || []).filter(function (id) { return !!featureById(id); });
      cat.options.forEach(function (o) {
        var cid = s.choices && s.choices[o.id];
        if (o.choices.some(function (c) { return c.id === cid; })) state.choices[o.id] = cid;
      });
    } catch (e) { /* ignore */ }
  }

  /* ---------- selection rules ---------- */
  function has(id) { return state.features.indexOf(id) !== -1; }
  function addWithRequires(id, added) {
    if (has(id)) return;
    var f = featureById(id);
    (f.requires || []).forEach(function (r) { addWithRequires(r, added); });
    state.features.push(id);
    added.push(id);
  }
  function removeWithDependants(id) {
    state.features = state.features.filter(function (x) { return x !== id; });
    allFeatures().forEach(function (e) {
      if ((e.feature.requires || []).indexOf(id) !== -1 && has(e.feature.id)) removeWithDependants(e.feature.id);
    });
  }
  var lastAdded = [];
  function toggle(id, on) {
    lastAdded = [];
    if (on) {
      var added = [];
      addWithRequires(id, added);
      lastAdded = added.filter(function (x) { return x !== id; });
    } else {
      removeWithDependants(id);
    }
    changed();
  }
  function choose(optId, choiceId) { lastAdded = []; state.choices[optId] = choiceId; changed(); }
  function clear() { lastAdded = []; state = { features: [], choices: defaults() }; changed(); }

  function changed() {
    save();
    JP.mode = "custom";
    paint();
    document.dispatchEvent(new CustomEvent("jp:custom", { detail: { count: state.features.length } }));
  }

  /* ---------- price ---------- */
  function totalUsd() {
    var t = cat.baseUsd;
    cat.options.forEach(function (o) { t += choiceOf(o).usd; });
    state.features.forEach(function (id) { t += featureById(id).usd; });
    return t;
  }
  function roundTo(n, step) { return Math.round(n / step) * step; }

  /** { usdLow, usdHigh, tomanLow, tomanHigh }  (toman* are null when there is no exchange rate) */
  function estimate() {
    var r = cat.range, t = totalUsd();
    var low = Math.max(r.roundUsd, roundTo(t * r.low, r.roundUsd));
    var high = roundTo(t * r.high, r.roundUsd);
    if (high <= low) high = low + r.roundUsd;
    var rialRate = rate && rate.rateRial;
    return {
      usdLow: low, usdHigh: high,
      tomanLow: rialRate ? roundTo(low * rialRate / 10, r.roundToman) : null,
      tomanHigh: rialRate ? roundTo(high * rialRate / 10, r.roundToman) : null,
    };
  }
  var nf = { en: new Intl.NumberFormat("en-US"), fa: new Intl.NumberFormat("fa-IR") };
  /** currency "toman" | "usd"; the style follows the page language. */
  function rangeText(currency) {
    var e = estimate();
    if (currency === "toman" && e.tomanLow == null) currency = "usd";
    var lo = currency === "toman" ? e.tomanLow : e.usdLow, hi = currency === "toman" ? e.tomanHigh : e.usdHigh;
    if (JP.lang === "fa") return nf.fa.format(lo) + " تا " + nf.fa.format(hi) + " " + JP.t(currency === "toman" ? "custom.unit.toman" : "custom.unit.usd");
    return "$" + nf.en.format(lo) + " – $" + nf.en.format(hi);
  }
  /** The range the visitor sees: Toman in Persian (when a rate exists), dollars in English. */
  function shownRange() { return rangeText(JP.lang === "fa" ? "toman" : "usd"); }
  function usesToman() { return JP.lang === "fa" && !!(rate && rate.rateRial); }

  /* ---------- views ---------- */
  var CHECK = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';

  function renderMain() {
    var host = $("customMain");
    if (!host) return;
    host.textContent = "";
    var uid = 0;

    cat.options.forEach(function (o) {
      var fs = el("fieldset", "custom-option");
      fs.appendChild(el("legend", "custom-option__legend", JP.pick(o.label)));
      var row = el("div", "custom-option__choices");
      o.choices.forEach(function (c) {
        var id = "opt-" + o.id + "-" + c.id;
        var lab = el("label", "choice");
        var inp = el("input"); inp.type = "radio"; inp.name = "opt-" + o.id; inp.id = id; inp.value = c.id;
        inp.dataset.option = o.id;
        inp.addEventListener("change", function () { if (inp.checked) choose(o.id, c.id); });
        lab.appendChild(inp);
        lab.appendChild(el("span", "choice__label", JP.pick(c.label)));
        row.appendChild(lab);
      });
      fs.appendChild(row);
      host.appendChild(fs);
    });

    host.appendChild(el("h3", "custom-features-title", JP.t("custom.featuresTitle")));
    cat.groups.forEach(function (g) {
      var sec = el("section", "custom-group");
      sec.appendChild(el("h4", "custom-group__title", JP.pick(g.label)));
      var grid = el("div", "feature-grid");
      g.features.forEach(function (f) {
        uid++;
        var lab = el("label", "feature"); lab.dataset.id = f.id;
        var inp = el("input", "feature__input"); inp.type = "checkbox"; inp.dataset.id = f.id; inp.id = "ft-" + f.id;
        inp.addEventListener("change", function () { toggle(f.id, inp.checked); });
        lab.appendChild(inp);
        var box = el("span", "feature__check"); box.setAttribute("aria-hidden", "true"); box.innerHTML = CHECK;
        lab.appendChild(box);
        var body = el("span", "feature__body");
        body.appendChild(el("strong", "feature__name", JP.pick(f.name)));
        body.appendChild(el("span", "feature__desc", JP.pick(f.desc)));
        if (f.requires && f.requires.length) body.appendChild(el("span", "feature__needs", JP.t("custom.needs", { names: names(f.requires) })));
        lab.appendChild(body);
        grid.appendChild(lab);
      });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
  }

  function paint() {
    // controls
    document.querySelectorAll("#customMain .feature").forEach(function (lab) {
      var on = has(lab.dataset.id);
      lab.classList.toggle("is-on", on);
      lab.querySelector("input").checked = on;
    });
    document.querySelectorAll("#customMain input[type=radio]").forEach(function (r) {
      r.checked = state.choices[r.dataset.option] === r.value;
      r.closest(".choice").classList.toggle("is-on", r.checked);
    });

    // summary card
    var none = $("customNone"), body = $("customBody");
    if (!none || !body) return;
    var n = state.features.length;
    none.hidden = n > 0; body.hidden = n === 0;
    if (n === 0) return;
    $("customCount").textContent = JP.t("custom.summary.count", { n: JP.pricing.number(n) });
    var list = $("customList"); list.textContent = "";
    var opts = cat.options.map(function (o) { return JP.pick(choiceOf(o).label); }).join(" · ");
    list.appendChild(el("li", "custom-summary__opts", opts));
    allFeatures().forEach(function (e) { if (has(e.feature.id)) list.appendChild(el("li", "", JP.pick(e.feature.name))); });
    $("customPrice").textContent = shownRange();
    var rn = $("customRateNote");
    if (rn) rn.textContent = JP.t(JP.lang === "fa" && !usesToman() ? "custom.summary.rateUsd" : "custom.summary.rate");
    var added = $("customAdded");
    if (!added) { added = el("p", "custom-summary__added"); added.id = "customAdded"; $("customCount").insertAdjacentElement("afterend", added); }
    added.textContent = lastAdded.length ? JP.t("custom.added", { names: names(lastAdded) }) : "";
    added.hidden = !lastAdded.length;
  }

  /* ---------- public API ---------- */
  JP.custom = {
    count: function () { return state.features.length; },
    features: function () { return allFeatures().filter(function (e) { return has(e.feature.id); }); },
    choices: function () { return cat.options.map(function (o) { return { option: o, choice: choiceOf(o) }; }); },
    groups: function () { return cat.groups; },
    estimate: estimate,
    rangeText: shownRange,
    usdText: function () { return rangeText("usd"); },
    usesToman: usesToman,
    rate: function () { return rate && rate.rateRial ? rate.rateRial / 10 : null; },   // Toman per USD
    clear: clear,
  };

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (!$("customMain")) return;
    Promise.all([
      fetch(JP.root + "data/custom.json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("data/custom.json -> " + r.status);
        return r.json();
      }),
      JP.pricing.load(),
      JP.ready,
    ]).then(function (r) {
      cat = r[0]; rate = r[1].rate;
      restore();
      renderMain();
      JP.mode = "custom";                       // this page only ever sends custom package requests
      paint();
      JP.pricing.fillNotes();
      $("customClear").addEventListener("click", clear);
      document.dispatchEvent(new CustomEvent("jp:custom", { detail: { count: state.features.length } }));
    }).catch(function (e) { console.error("[custom.js]", e); });
  });
})();
