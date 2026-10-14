/* Jolly Panda Web — project-page.js: the "copy link" share button on the (static) project pages. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector('[data-share="copy"]');
    if (!btn) return;
    btn.addEventListener("click", function () {
      var tip = btn.querySelector("[data-share-tooltip]"), orig = tip ? tip.textContent : "";
      var text = btn.getAttribute("data-copy") || window.location.href;
      var done = function () {
        if (!tip) return;
        tip.textContent = btn.getAttribute("data-copied") || orig; tip.classList.add("is-visible");
        setTimeout(function () { tip.classList.remove("is-visible"); setTimeout(function () { tip.textContent = orig; }, 200); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () {});
      else {
        var ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) { /* no-op */ }
        document.body.removeChild(ta); done();
      }
    });
  });
})();
