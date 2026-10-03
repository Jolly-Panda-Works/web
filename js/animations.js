/* ==========================================================================
   Jolly Panda Studio — animations.js
   Lightweight scroll-triggered reveal animations using IntersectionObserver.
   No animation libraries — just class toggles that CSS transitions handle.

   Exposes window.JollyPandaAnimations.observe(elements) so other modules
   (e.g. team.js, which injects cards after an async fetch) can register
   newly-created nodes with the same reveal behavior.
   ========================================================================== */

(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var observer = null;

  function revealImmediately(elements) {
    elements.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function getObserver() {
    if (observer || !("IntersectionObserver" in window)) return observer;
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px",
      }
    );
    return observer;
  }

  function observe(elements) {
    var list = elements instanceof Element ? [elements] : Array.prototype.slice.call(elements);
    if (!list.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      revealImmediately(list);
      return;
    }

    var obs = getObserver();
    list.forEach(function (el) {
      obs.observe(el);
    });
  }

  function initScrollReveal() {
    var targets = document.querySelectorAll("[data-reveal], [data-reveal-group]");
    if (!targets.length) return;
    observe(targets);
  }

  document.addEventListener("DOMContentLoaded", initScrollReveal);

  window.JollyPandaAnimations = { observe: observe };
})();
