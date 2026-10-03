/* ==========================================================================
   Jolly Panda Web — projects.js
   Portfolio page: renders data/projects.json with live text search and
   filter chips by website type (blog, portfolio, corporate, ...). Chips are
   built from the types that actually appear in the data, so adding a project
   of a new type adds its chip automatically. Cards open a details dialog.
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var projects = [], types = {}, state = { type: "all", query: "" };
  var grid, results, filters, modal, lastFocus = null, debounce = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function norm(s) { return String(s || "").toLowerCase().trim(); }
  function typeName(id) { return types[id] ? JP.pick(types[id].name) : JP.t("projects.other"); }

  function matches(p) {
    if (state.type !== "all" && p.type !== state.type) return false;
    var q = norm(state.query);
    if (!q) return true;
    var hay = [
      JP.pick(p.title), JP.pick(p.title, "en"), JP.pick(p.title, "fa"),
      JP.pick(p.shortDescription), JP.pick(p.shortDescription, "en"), JP.pick(p.shortDescription, "fa"),
      (p.tags || []).join(" "), typeName(p.type), types[p.type] ? JP.pick(types[p.type].name, "en") : "", p.year || "",
    ].join(" ").toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  /* cover: the real screenshot when `image` is set and loads, otherwise a brand-style browser mock */
  function placeholder(p) {
    var ph = el("div", "cover-ph");
    var bar = el("div", "cover-ph__bar"); bar.innerHTML = "<i></i><i></i><i></i>";
    ph.appendChild(bar);
    ph.appendChild(el("div", "cover-ph__body", p.domain || JP.pick(p.title, "en")));
    return ph;
  }
  function cover(p, host) {
    if (p.image) {
      var img = new Image();
      img.alt = JP.pick(p.title); img.loading = "lazy"; img.decoding = "async";
      img.onerror = function () { host.textContent = ""; host.classList.add("project-card__media--ph"); host.appendChild(placeholder(p)); };
      img.src = JP.root + p.image;
      host.appendChild(img);
    } else {
      host.classList.add("project-card__media--ph");
      host.appendChild(placeholder(p));
    }
  }

  function card(p) {
    var c = el("button", "project-card"); c.type = "button";
    var media = el("div", "project-card__media");
    cover(p, media);
    media.appendChild(el("span", "project-card__badge", typeName(p.type)));
    var body = el("div", "project-card__body");
    body.appendChild(el("h3", "project-card__title", JP.pick(p.title)));
    body.appendChild(el("p", "project-card__desc", JP.pick(p.shortDescription)));
    var tags = el("div", "project-card__tags");
    (p.tags || []).slice(0, 4).forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
    body.appendChild(tags);
    var foot = el("div", "project-card__footer");
    foot.appendChild(el("span", "project-card__year", p.year || ""));
    var link = el("span", "project-card__link");
    link.appendChild(el("span", "", JP.t("projects.viewDetails")));
    var ic = el("span", "dir-icon dir-icon--sm"); ic.setAttribute("aria-hidden", "true");
    ic.innerHTML = '<svg class="dir-icon__ltr" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="dir-icon__rtl" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    link.appendChild(ic); foot.appendChild(link); body.appendChild(foot);
    c.appendChild(media); c.appendChild(body);
    c.addEventListener("click", function () { openModal(p, c); });
    return c;
  }

  function render() {
    var list = projects.filter(matches);
    var n = list.length;
    results.textContent = n === 1 ? JP.t("projects.countOne") : JP.t("projects.countOther", { count: JP.lang === "fa" ? new Intl.NumberFormat("fa-IR").format(n) : n });
    grid.textContent = "";
    if (!n) {
      var empty = el("div", "projects__empty");
      empty.appendChild(el("h3", "", JP.t("projects.empty")));
      empty.appendChild(el("p", "", JP.t("projects.emptyHint")));
      grid.appendChild(empty);
      return;
    }
    var frag = document.createDocumentFragment();
    list.forEach(function (p) { frag.appendChild(card(p)); });
    grid.appendChild(frag);
  }

  function renderChips() {
    filters.textContent = "";
    var present = {};
    projects.forEach(function (p) { present[p.type] = true; });
    var ids = ["all"].concat(Object.keys(types).filter(function (id) { return present[id]; }));
    Object.keys(present).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    ids.forEach(function (id) {
      var b = el("button", "filter-chip" + (state.type === id ? " is-active" : ""), id === "all" ? JP.t("projects.all") : typeName(id));
      b.type = "button"; b.setAttribute("aria-pressed", state.type === id ? "true" : "false");
      b.addEventListener("click", function () { state.type = id; renderChips(); render(); });
      filters.appendChild(b);
    });
  }

  /* ---------- details dialog ---------- */
  function openModal(p, opener) {
    lastFocus = opener;
    var media = document.getElementById("modalMedia"); media.textContent = ""; media.className = "modal__media";
    cover(p, media);
    document.getElementById("modalType").textContent = typeName(p.type) + (p.year ? " · " + p.year : "");
    document.getElementById("modalTitle").textContent = JP.pick(p.title);
    var text = document.getElementById("modalText"); text.textContent = "";
    JP.pick(p.fullDescription || p.shortDescription).split(/\n\n+/).forEach(function (para) { text.appendChild(el("p", "", para)); });
    var list = (p.highlights && (p.highlights[JP.lang] || p.highlights.en)) || [];
    var ul = document.getElementById("modalHighlights"); ul.textContent = "";
    list.forEach(function (h) { ul.appendChild(el("li", "", h)); });
    document.getElementById("modalHlTitle").hidden = ul.hidden = !list.length;
    var tags = document.getElementById("modalTags"); tags.textContent = "";
    (p.tags || []).forEach(function (t) { tags.appendChild(el("li", "tag", t)); });
    var visit = document.getElementById("modalVisit");
    if (p.url) { visit.href = p.url; visit.hidden = false; } else { visit.hidden = true; }
    modal.hidden = false; document.body.classList.add("is-modal-open");
    modal.querySelector(".modal__panel").focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true; document.body.classList.remove("is-modal-open");
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("DOMContentLoaded", function () {
    grid = document.getElementById("projectsGrid");
    results = document.getElementById("projectsResults");
    filters = document.getElementById("projectsFilters");
    modal = document.getElementById("projectModal");
    if (!grid) return;

    modal.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
      if (e.key === "Tab" && !modal.hidden) {          // keep focus inside the dialog
        var f = modal.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])");
        f = Array.prototype.filter.call(f, function (n) { return !n.hidden && n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === modal.querySelector(".modal__panel"))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.getElementById("projectsSearch").addEventListener("input", function (e) {
      var v = e.target.value; clearTimeout(debounce);
      debounce = setTimeout(function () { state.query = v; render(); }, 160);
    });

    Promise.all([
      JP.ready,
      fetch(JP.root + "data/projects.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("projects.json " + r.status); return r.json(); }),
      fetch(JP.root + "data/plans.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : { types: [] }; }),
    ]).then(function (r) {
      projects = r[1];
      r[2].types.forEach(function (t) { types[t.id] = t; });
      var q = new URLSearchParams(window.location.search).get("type");
      if (q && types[q]) state.type = q;
      renderChips(); render();
    }).catch(function (e) {
      console.error("[projects.js]", e);
      grid.textContent = ""; var box = el("div", "projects__empty"); box.appendChild(el("p", "", JP.t("projects.error"))); grid.appendChild(box);
    });
  });
})();
