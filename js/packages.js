/* ==========================================================================
   Jolly Panda Web — packages.js
   Renders the price list from data/plans.json exactly as in the PowerPoint:
     - the comparison table (website type x plan)          -> #priceTable
     - one tab per website type with the three plan cards   -> #typeTabs / #planGrid
   Plans are selectable. The selection lives in JP.selection, is remembered for
   the browser session, announced through a "jp:selection" event (the form and
   the floating bar listen to it) and can be pre-set with ?type=blog&plan=special.
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var STORE_KEY = "jp:selection";
  var data = null;
  var activeType = null;
  JP.selection = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function typeById(id) { return data.plans.types.filter(function (t) { return t.id === id; })[0]; }
  function planById(id) { return data.plans.plans.filter(function (p) { return p.id === id; })[0]; }

  function priceNode(usd, cls) {
    var f = JP.pricing.format(usd, data);
    var wrap = document.createDocumentFragment();
    var main = el("span", cls || "", f.main);
    wrap.appendChild(main);
    if (f.sub) wrap.appendChild(el("span", "price-sub", f.sub));
    return wrap;
  }

  /* ---------- selection ---------- */
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(JP.selection)); } catch (e) { /* private mode */ }
  }
  function restore() {
    var q = new URLSearchParams(window.location.search);
    var t = q.get("type"), p = q.get("plan");
    if (t && p && typeById(t) && planById(p)) return { type: t, plan: p };
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (s && typeById(s.type) && planById(s.plan)) return s;
    } catch (e) { /* ignore */ }
    return null;
  }

  function select(typeId, planId, opts) {
    JP.selection = { type: typeId, plan: planId };
    save();
    if (!opts || !opts.silent) { activeType = typeId; }
    paintSelection();
    renderTabs();
    renderDetails();
    document.dispatchEvent(new CustomEvent("jp:selection", { detail: JP.selection }));
  }

  function selectionLabel() {
    if (!JP.selection) return "";
    var ty = typeById(JP.selection.type), pl = planById(JP.selection.plan);
    var usd = ty.rows[pl.id].price;
    return JP.pick(ty.name) + " — " + JP.pick(pl.name) + " — " + JP.pricing.plain(usd, data);
  }

  function paintSelection() {
    document.querySelectorAll(".price-cell").forEach(function (b) {
      var on = JP.selection && b.dataset.type === JP.selection.type && b.dataset.plan === JP.selection.plan;
      b.classList.toggle("is-selected", !!on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var bar = document.getElementById("selectionBar");
    var text = document.getElementById("barText");
    document.body.classList.toggle("has-selection", !!JP.selection);
    if (bar && text) {
      bar.hidden = !JP.selection || barSuppressed;
      text.textContent = selectionLabel();
    }
  }

  /* ---------- comparison table ---------- */
  function renderTable() {
    var table = document.getElementById("priceTable");
    if (!table) return;
    table.textContent = "";
    table.appendChild(el("caption", "", JP.t("packages.compare.caption")));

    var thead = el("thead"), hr = el("tr");
    var th0 = el("th", "", JP.t("packages.compare.typeHeader")); th0.scope = "col"; th0.style.textAlign = "start";
    hr.appendChild(th0);
    data.plans.plans.forEach(function (pl) {
      var th = el("th", pl.id === data.plans.highlightPlan ? "is-highlight" : "", JP.pick(pl.name));
      th.scope = "col";
      if (pl.id === data.plans.highlightPlan && pl.badge) th.appendChild(el("span", "th-badge", JP.pick(pl.badge)));
      hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);

    var tbody = el("tbody");
    data.plans.types.forEach(function (ty) {
      var tr = el("tr");
      var th = el("th", "", JP.pick(ty.name)); th.scope = "row"; tr.appendChild(th);
      data.plans.plans.forEach(function (pl) {
        var td = el("td", pl.id === data.plans.highlightPlan ? "is-highlight" : "");
        var b = el("button", "price-cell"); b.type = "button";
        b.dataset.type = ty.id; b.dataset.plan = pl.id;
        b.setAttribute("aria-label", JP.t("packages.cellSelect", { type: JP.pick(ty.name), plan: JP.pick(pl.name) }));
        b.appendChild(priceNode(ty.rows[pl.id].price));
        b.addEventListener("click", function () { select(ty.id, pl.id); });
        td.appendChild(b); tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }

  /* ---------- tabs + plan cards ---------- */
  function renderTabs() {
    var host = document.getElementById("typeTabs");
    if (!host) return;
    host.textContent = "";
    data.plans.types.forEach(function (ty) {
      var b = el("button", "type-tab", JP.pick(ty.name));
      b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", ty.id === activeType ? "true" : "false");
      b.addEventListener("click", function () { activeType = ty.id; renderTabs(); renderDetails(); });
      host.appendChild(b);
    });
  }

  function renderDetails() {
    var ty = typeById(activeType);
    var head = document.getElementById("typeHead");
    var grid = document.getElementById("planGrid");
    if (!ty || !head || !grid) return;

    head.textContent = "";
    head.appendChild(el("h3", "", JP.pick(ty.title)));
    head.appendChild(el("p", "", JP.pick(ty.tagline)));

    grid.textContent = "";
    data.plans.plans.forEach(function (pl) {
      var row = ty.rows[pl.id];
      var highlight = pl.id === data.plans.highlightPlan;
      var selected = JP.selection && JP.selection.type === ty.id && JP.selection.plan === pl.id;
      var card = el("article", "plan-card" + (highlight ? " plan-card--highlight" : "") + (selected ? " is-selected" : ""));
      if (highlight && pl.badge) card.appendChild(el("span", "plan-card__badge", JP.pick(pl.badge)));
      card.appendChild(el("h4", "plan-card__name", JP.pick(pl.name)));

      var price = el("div", "plan-card__price");
      price.appendChild(el("span", "plan-card__price-label", JP.t("pricing.startingPrice")));
      var f = JP.pricing.format(row.price, data);
      price.appendChild(el("span", "plan-card__price-value", f.main));
      if (f.sub) price.appendChild(el("span", "price-sub", f.sub));
      card.appendChild(price);

      var ul = el("ul", "plan-card__list");
      data.plans.features.forEach(function (ft) {
        var label = ft.id === "structure" && ty.structureLabel ? ty.structureLabel : ft.label;
        var li = el("li");
        li.appendChild(el("span", "k", JP.pick(label)));
        li.appendChild(el("span", "v", JP.pick(row[ft.id])));
        ul.appendChild(li);
      });
      card.appendChild(ul);

      var btn = el("button", "btn btn-primary plan-card__btn", selected ? JP.t("packages.selected") : JP.t("packages.select"));
      btn.type = "button";
      btn.addEventListener("click", function () { select(ty.id, pl.id); });
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  /* hide the floating bar while the form itself is on screen */
  var barSuppressed = false;
  function watchForm() {
    var form = document.getElementById("request");
    if (!form || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      barSuppressed = entries[0].isIntersecting;
      var bar = document.getElementById("selectionBar");
      if (bar) bar.hidden = !JP.selection || barSuppressed;
    }, { threshold: 0.15 }).observe(form);
  }

  document.addEventListener("DOMContentLoaded", function () {
    Promise.all([JP.pricing.load(), JP.ready]).then(function (r) {
      data = r[0];
      var pre = restore();
      activeType = pre ? pre.type : data.plans.types[0].id;
      JP.selection = pre;
      renderTable();
      renderTabs();
      renderDetails();
      paintSelection();
      watchForm();
      JP.pricing.fillNotes();
      document.dispatchEvent(new CustomEvent("jp:packages-ready", { detail: { data: data } }));
      if (pre) document.dispatchEvent(new CustomEvent("jp:selection", { detail: JP.selection }));
      if (window.JollyPandaAnimations) window.JollyPandaAnimations.observe(document.querySelectorAll("#priceTable"));
    }).catch(function (e) {
      console.error("[packages.js]", e);
    });
  });
})();
