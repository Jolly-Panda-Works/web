/* ==========================================================================
   Jolly Panda Web — notfound.js
   The 404 page is one file for the whole site, so the language is chosen here:
   addresses under /fa/ get the Persian version (right-to-left, Persian texts, Persian
   links), everything else English. The EN / فا buttons switch it without leaving the page.
   ========================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;
  var dicts = {};

  function get(obj, key) {
    return key.split(".").reduce(function (a, k) { return a && typeof a === "object" ? a[k] : undefined; }, obj);
  }
  function load(lang) {
    if (dicts[lang]) return Promise.resolve(dicts[lang]);
    return fetch("/lang/" + lang + ".json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("lang " + r.status); return r.json();
    }).then(function (d) { dicts[lang] = d; return d; });
  }

  /* page links: /index.html -> /fa/index.html (assets, css, js and external links stay as they are) */
  function pageLinks(lang) {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var raw = a.getAttribute("data-href") || a.getAttribute("href");
      if (!a.hasAttribute("data-href")) a.setAttribute("data-href", raw);           // remember the English target
      if (!/^\/(?!\/)/.test(raw) || !/\.html($|[?#])/.test(raw)) return;
      a.setAttribute("href", lang === "fa" ? "/fa" + raw : raw);
    });
  }

  function apply(lang) {
    return load(lang).then(function (dict) {
      html.setAttribute("lang", lang);
      html.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
      document.body.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var v = get(dict, el.getAttribute("data-i18n")); if (typeof v === "string") el.textContent = v;
      });
      document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
        el.getAttribute("data-i18n-attr").split("|").forEach(function (pair) {
          var i = pair.indexOf(":"), v = get(dict, pair.slice(i + 1));
          if (typeof v === "string") el.setAttribute(pair.slice(0, i), v);
        });
      });
      document.querySelectorAll("[data-" + lang + "]").forEach(function (el) { el.textContent = el.getAttribute("data-" + lang); });   // footer service names
      document.title = get(dict, "notFound.metaTitle") || document.title;
      pageLinks(lang);
      document.querySelectorAll(".lang-switch__btn").forEach(function (b) {
        var on = b.getAttribute("data-lang") === lang;
        b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".lang-switch__btn").forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-lang")); });
    });
    apply(/^\/fa(\/|$)/.test(window.location.pathname) ? "fa" : "en").catch(function (e) { console.error("[notfound.js]", e); });
  });
})();
