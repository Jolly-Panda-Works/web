/* ==========================================================================
   Jolly Panda Web — language.js
   The page text is already baked into each HTML file at build time (English at
   the site root, Persian under /fa/), so crawlers always see real content.
   This script only (1) loads the matching dictionary for dynamic content,
   (2) exposes window.JP = { lang, dir, root, t(), ready }, and (3) wires the
   EN/FA switch, which navigates to the same page in the other language.
   All URLs are relative, so the site works on a GitHub Pages sub-path too.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var lang = html.getAttribute("lang") === "fa" ? "fa" : "en";
  var root = html.getAttribute("data-root") || "";
  var file = document.body.getAttribute("data-file") || "index.html";

  var JP = (window.JP = window.JP || {});
  JP.lang = lang;
  JP.dir = lang === "fa" ? "rtl" : "ltr";
  JP.root = root;
  JP.dict = null;

  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && typeof acc === "object" ? acc[key] : undefined;
    }, obj);
  }

  /** JP.t("form.ok.text", { email: "a@b.c" }) — falls back to the key itself. */
  JP.t = function (key, vars) {
    var value = JP.dict ? getPath(JP.dict, key) : undefined;
    if (typeof value !== "string") return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        value = value.split("{" + k + "}").join(vars[k]);
      });
    }
    return value;
  };

  /** Picks the current language from a bilingual field like { en, fa }. */
  JP.pick = function (field, forceLang) {
    var l = forceLang || lang;
    if (field == null) return "";
    if (typeof field === "string") return field;
    return field[l] || field.en || "";
  };

  JP.ready = fetch(root + "lang/" + lang + ".json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load language file: " + lang);
      return res.json();
    })
    .then(function (dict) {
      JP.dict = dict;
      return dict;
    });

  function initSwitch() {
    document.querySelectorAll(".lang-switch__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-lang");
        if (target === lang) return;
        // en page "index.html" <-> fa page "fa/index.html" (and back with ../)
        var dest = target === "fa" ? "fa/" + file : (root ? root : "") + file;
        window.location.href = dest + window.location.search + window.location.hash;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initSwitch);
})();
