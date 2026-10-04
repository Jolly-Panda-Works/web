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
  var grid, results, filters, debounce = null;

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
    var c = el("a", "project-card"); c.href = "project-detail.html?id=" + encodeURIComponent(p.id);
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

  document.addEventListener("DOMContentLoaded", function () {
    grid = document.getElementById("projectsGrid");
    results = document.getElementById("projectsResults");
    filters = document.getElementById("projectsFilters");
    if (!grid) return;

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
