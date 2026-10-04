/* ==========================================================================
   Jolly Panda Web — project-detail.js
   Project page, same layout and styling as the main site's project page:
   full-bleed hero with title, links and share row, description + highlights +
   technologies, optional gallery with lightbox, and a closing call-to-action.
   Reads ?id=, loads data/projects.json and renders the matching project in the
   current language. Projects without a cover image get a brand-style browser
   mock instead (set `image` in data/projects.json to show a real screenshot).
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var root = null, project = null, types = {};

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function list(field) { return (field && (field[JP.lang] || field.en)) || []; }

  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11 8v6M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none"><path d="M14 5h5v5M19 5l-9 9M9 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L12.5 19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 4H5.5l12.2 16z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 4.5L2.9 11.6c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 10.6-6.7c.5-.3 1-.1.6.2l-8.6 7.8h0l-.3 4.6c.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.2c.3-1.3-.5-1.9-1.5-1.7z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 3.5a1.96 1.96 0 100 3.92 1.96 1.96 0 000-3.92zM20.44 20h-3.37v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.68V8.5h3.24v1.57h.05c.45-.86 1.56-1.76 3.2-1.76 3.43 0 4.06 2.25 4.06 5.18V20z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  function dirIcon(sm, rtlFirst) {
    // twin-SVG convention: separate LTR / RTL arrows (CSS shows the right one)
    var ltr = rtlFirst ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6";
    var rtl = rtlFirst ? "M5 12h14M13 6l6 6-6 6" : "M19 12H5M11 6l-6 6 6 6";
    return '<span class="dir-icon' + (sm ? " dir-icon--sm" : "") + '" aria-hidden="true"><svg class="dir-icon__ltr" viewBox="0 0 24 24" fill="none"><path d="' + ltr + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="dir-icon__rtl" viewBox="0 0 24 24" fill="none"><path d="' + rtl + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  }
  function navIcon(dir) {
    var start = "M15 6l-6 6 6 6", end = "M9 6l6 6-6 6";
    var ltr = dir === "prev" ? start : end, rtl = dir === "prev" ? end : start;
    return '<span class="dir-icon" aria-hidden="true"><svg class="dir-icon__ltr" viewBox="0 0 24 24" fill="none"><path d="' + ltr + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="dir-icon__rtl" viewBox="0 0 24 24" fill="none"><path d="' + rtl + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  }

  /* ---------- placeholder cover (used when a project has no screenshot) ---------- */
  function placeholder(p) {
    return '<div class="cover-ph"><div class="cover-ph__bar"><i></i><i></i><i></i></div><div class="cover-ph__body">' + esc(p.domain || JP.pick(p.title, "en")) + "</div></div>";
  }

  /* ---------- lightbox (gallery) ---------- */
  var lb = null, lbItems = [], lbIndex = 0, lbFocus = null;
  function ensureLightbox() {
    if (lb) return lb;
    lb = document.createElement("div");
    lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<div class="lightbox__stage">' +
      '<button type="button" class="lightbox__close" data-lb-close aria-label="' + esc(JP.t("projectDetail.gallery.close")) + '">' + ICONS.close + "</button>" +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" data-lb-prev aria-label="' + esc(JP.t("projectDetail.gallery.prev")) + '">' + navIcon("prev") + "</button>" +
      '<button type="button" class="lightbox__nav lightbox__nav--next" data-lb-next aria-label="' + esc(JP.t("projectDetail.gallery.next")) + '">' + navIcon("next") + "</button>" +
      '<div class="lightbox__media-wrap" data-lb-media></div><p class="lightbox__caption" data-lb-caption></p><p class="lightbox__counter" data-lb-counter></p></div>';
    document.body.appendChild(lb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    lb.querySelector("[data-lb-close]").addEventListener("click", closeLb);
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { showLb(lbIndex - 1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { showLb(lbIndex + 1); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      var rtl = JP.dir === "rtl";
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") showLb(lbIndex + (rtl ? -1 : 1));
      if (e.key === "ArrowLeft") showLb(lbIndex + (rtl ? 1 : -1));
    });
    return lb;
  }
  function showLb(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIndex];
    lb.querySelector("[data-lb-media]").innerHTML = '<img src="' + esc(JP.root + it.src) + '" alt="' + esc(it.caption) + '"/>';
    var cap = lb.querySelector("[data-lb-caption]"); cap.textContent = it.caption || ""; cap.style.display = it.caption ? "" : "none";
    lb.querySelector("[data-lb-counter]").textContent = JP.t("projectDetail.gallery.counter", { current: lbIndex + 1, total: lbItems.length });
    var nav = lbItems.length > 1 ? "" : "none";
    lb.querySelector("[data-lb-prev]").style.display = nav; lb.querySelector("[data-lb-next]").style.display = nav;
  }
  function openLb(items, i) {
    ensureLightbox(); lbItems = items; lbFocus = document.activeElement; showLb(i || 0);
    lb.classList.add("is-open"); document.body.style.overflow = "hidden"; lb.querySelector("[data-lb-close]").focus();
  }
  function closeLb() {
    if (!lb) return;
    lb.classList.remove("is-open"); document.body.style.overflow = "";
    if (lbFocus && lbFocus.focus) lbFocus.focus();
  }

  function gallerySection(p) {
    if (!p.gallery || !p.gallery.length) return "";
    var items = p.gallery.map(function (g) { return { src: g.src, caption: JP.pick(g.caption) }; });
    var frames = items.map(function (it, i) {
      return '<button type="button" class="gallery-frame" data-gallery-index="' + i + '" aria-label="' + esc(it.caption || JP.t("projectDetail.gallery.galleryTitle")) + '">' +
        '<img src="' + esc(JP.root + it.src) + '" alt="" loading="lazy" draggable="false"/>' +
        '<span class="gallery-frame__zoom" aria-hidden="true">' + ICONS.zoom + "</span>" +
        (it.caption ? '<span class="gallery-frame__caption">' + esc(it.caption) + "</span>" : "") + "</button>";
    }).join("");
    return '<section class="section section--tight project-gallery" data-reveal><div class="container"><h2>' + esc(JP.t("projectDetail.gallery.galleryTitle")) +
      '</h2><div class="project-gallery__scroll">' + frames + "</div></div></section>";
  }
  function wireGallery() {
    if (!project.gallery || !project.gallery.length) return;
    var items = project.gallery.map(function (g) { return { src: g.src, caption: JP.pick(g.caption) }; });
    var scroller = root.querySelector(".project-gallery__scroll"), drag = false, moved = false, x0 = 0, s0 = 0;
    scroller.addEventListener("mousedown", function (e) { drag = true; moved = false; x0 = e.pageX; s0 = scroller.scrollLeft; });
    document.addEventListener("mousemove", function (e) { if (!drag) return; var dx = e.pageX - x0; if (Math.abs(dx) > 4) { moved = true; scroller.classList.add("is-dragging"); } if (moved) scroller.scrollLeft = s0 - dx; });
    document.addEventListener("mouseup", function () { drag = false; scroller.classList.remove("is-dragging"); });
    root.querySelectorAll("[data-gallery-index]").forEach(function (b) {
      b.addEventListener("click", function (e) { if (moved) { e.preventDefault(); return; } openLb(items, parseInt(b.getAttribute("data-gallery-index"), 10)); });
    });
  }

  /* ---------- links + share ---------- */
  function actionLinks(links, ghost) {
    return (links || []).map(function (l) {
      var label = l.label ? JP.pick(l.label) : JP.t("projectDetail.actionLinks." + (l.type || "website"));
      return '<a href="' + esc(l.url) + '" class="action-link' + (ghost ? " action-link--ghost" : "") + '" target="_blank" rel="noopener noreferrer">' + ICONS.external + "<span>" + esc(label) + "</span></a>";
    }).join("");
  }
  function shareRow() {
    var t = function (k) { return esc(JP.t("projectDetail.share." + k)); };
    return '<div class="share-row" data-share-row><span class="share-row__label">' + t("label") + "</span>" +
      '<button type="button" class="share-btn" data-share="copy" aria-label="' + t("copyLink") + '">' + ICONS.link + '<span class="share-btn__tooltip" data-share-tooltip>' + t("copyLink") + "</span></button>" +
      '<a class="share-btn" data-share="twitter" aria-label="' + t("twitter") + '" target="_blank" rel="noopener noreferrer">' + ICONS.x + "</a>" +
      '<a class="share-btn" data-share="telegram" aria-label="' + t("telegram") + '" target="_blank" rel="noopener noreferrer">' + ICONS.telegram + "</a>" +
      '<a class="share-btn" data-share="linkedin" aria-label="' + t("linkedin") + '" target="_blank" rel="noopener noreferrer">' + ICONS.linkedin + "</a></div>";
  }
  function wireShare(title) {
    var row = root.querySelector("[data-share-row]"); if (!row) return;
    var url = window.location.href;
    var message = JP.t("projectDetail.share.message", { project: title, team: JP.t("brand.name") });
    row.querySelector('[data-share="twitter"]').href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(message) + "&url=" + encodeURIComponent(url);
    row.querySelector('[data-share="telegram"]').href = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(message);
    row.querySelector('[data-share="linkedin"]').href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url);
    var copy = row.querySelector('[data-share="copy"]');
    copy.addEventListener("click", function () {
      var tip = copy.querySelector("[data-share-tooltip]"), orig = tip.textContent;
      var done = function () {
        tip.textContent = JP.t("projectDetail.share.copied"); tip.classList.add("is-visible");
        setTimeout(function () { tip.classList.remove("is-visible"); setTimeout(function () { tip.textContent = orig; }, 200); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(message + " " + url).then(done).catch(function () {});
      else { var ta = document.createElement("textarea"); ta.value = message + " " + url; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) { /* no-op */ } document.body.removeChild(ta); done(); }
    });
  }

  /* ---------- render ---------- */
  function notFound() {
    document.title = JP.t("projectDetail.notFound.title") + " — " + JP.t("brand.name");
    root.innerHTML = '<div class="container"><div class="project-not-found" style="padding-top:calc(var(--nav-height) + var(--space-2xl))"><h1>' + esc(JP.t("projectDetail.notFound.title")) + "</h1><p>" +
      esc(JP.t("projectDetail.notFound.desc")) + '</p><a href="projects.html" class="btn btn-primary">' + esc(JP.t("projectDetail.notFound.cta")) + "</a></div></div>";
  }

  function render() {
    var p = project, title = JP.pick(p.title), shortDesc = JP.pick(p.shortDescription);
    var typeLabel = types[p.type] ? JP.pick(types[p.type].name) : JP.t("projects.other");
    var links = p.actionLinks || [];
    document.title = title + " — " + JP.t("brand.name");
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", shortDesc);

    var paragraphs = JP.pick(p.fullDescription || p.shortDescription).split("\n\n").filter(Boolean).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("");
    var hl = list(p.highlights);
    var highlights = hl.length ? '<div class="project-detail__panel" data-reveal><h3>' + esc(JP.t("projectDetail.highlightsTitle")) + '</h3><ul class="project-detail__list">' +
      hl.map(function (h) { return "<li>" + ICONS.check + "<span>" + esc(h) + "</span></li>"; }).join("") + "</ul></div>" : "";
    var tags = (p.tags || []).length ? '<div class="project-detail__panel" data-reveal><h3>' + esc(JP.t("projectDetail.tagsTitle")) + '</h3><div class="project-detail__tags" dir="ltr">' +
      p.tags.map(function (t) { return '<span class="project-detail__tag">' + esc(t) + "</span>"; }).join("") + "</div></div>" : "";

    var hasImg = !!p.image;
    var cover = hasImg
      ? '<img class="project-hero__cover-img" src="' + esc(JP.root + p.image) + '" alt="" draggable="false"/>'
      : '<div class="project-hero__ph" aria-hidden="true">' + placeholder(p) + "</div>";
    var logo = p.logo ? '<span class="project-hero__logo"><img src="' + esc(JP.root + p.logo) + '" alt=""/></span>' : "";

    var hero = '<div class="project-hero' + (hasImg ? "" : " project-hero--ph") + '">' + cover + '<div class="project-hero__scrim"></div>' +
      '<a href="projects.html" class="project-hero__back">' + dirIcon(true, true) + "<span>" + esc(JP.t("projectDetail.back")) + "</span></a>" +
      '<div class="project-hero__overlay"><div class="container"><div data-reveal>' +
      '<div class="project-hero__identity">' + logo + "<div>" +
      '<div class="project-hero__meta"><span class="eyebrow">' + esc(typeLabel) + "</span>" + (p.year ? '<span class="project-card__year">' + esc(p.year) + "</span>" : "") + "</div>" +
      '<h1 class="project-hero__title">' + esc(title) + "</h1></div></div>" +
      '<p class="project-hero__desc">' + esc(shortDesc) + "</p>" +
      '<div class="project-hero__actions-row"><div class="project-hero__links">' + actionLinks(links, true) + "</div>" + shareRow() + "</div>" +
      "</div></div></div></div>";

    var body = '<section class="section section--tight"><div class="container"><div class="project-detail__grid">' +
      '<div class="project-detail__body" data-reveal>' + paragraphs + '</div><div class="project-detail__aside">' + highlights + tags + "</div></div></div></section>";

    var hasLinks = links.length > 0;
    var dlImg = hasImg ? '<div class="project-download__image" data-reveal><img src="' + esc(JP.root + p.image) + '" alt="' + esc(title) + '" draggable="false"/></div>'
      : '<div class="project-download__image project-download__image--ph" data-reveal>' + placeholder(p) + "</div>";
    var download = '<section class="section project-download"><div class="container"><div class="project-download__grid">' +
      '<div class="project-download__content" data-reveal><h2>' + esc(JP.t("projectDetail.download.title")) + "</h2><p>" +
      esc(JP.t(hasLinks ? "projectDetail.download.desc" : "projectDetail.download.descFallback")) + "</p>" +
      (hasLinks ? '<div class="project-download__links">' + actionLinks(links, false) + "</div>" : "") +
      '<div class="project-download__secondary"><a class="btn btn-primary" href="packages.html#packages" style="color:#fff">' + esc(JP.t("projectDetail.cta.button")) + '</a><a href="projects.html">' + esc(JP.t("projectDetail.back")) + "</a></div></div>" +
      dlImg + "</div></div></section>";

    root.innerHTML = hero + body + gallerySection(p) + download;
    if (window.JollyPandaAnimations) window.JollyPandaAnimations.observe(root.querySelectorAll("[data-reveal]"));
    wireGallery(); wireShare(title);
  }

  document.addEventListener("DOMContentLoaded", function () {
    root = document.getElementById("projectDetailRoot"); if (!root) return;
    var id = new URLSearchParams(window.location.search).get("id");
    Promise.all([
      JP.ready,
      fetch(JP.root + "data/projects.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("projects.json " + r.status); return r.json(); }),
      fetch(JP.root + "data/plans.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : { types: [] }; }),
    ]).then(function (r) {
      r[2].types.forEach(function (t) { types[t.id] = t; });
      project = r[1].filter(function (p) { return p.id === id; })[0];
      if (!project) { notFound(); return; }
      render();
    }).catch(function (e) {
      console.error("[project-detail.js]", e);
      root.innerHTML = '<div class="container"><div class="project-not-found" style="padding-top:calc(var(--nav-height) + var(--space-2xl))"><p>' + esc(JP.t("projectDetail.error")) + "</p></div></div>";
    });
  });
})();
