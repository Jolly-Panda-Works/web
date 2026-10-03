/* ==========================================================================
   Jolly Panda Studio — app.js
   Core interactive behavior: sticky-nav scroll state, responsive mobile
   menu, and closing the mobile menu after a link is used.
   ========================================================================== */

(function () {
  "use strict";

  function initStickyHeader() {
    var header = document.getElementById("siteHeader");
    if (!header) return;

    function updateHeaderState() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  }

  function initMobileMenu() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    function openMenu() {
      toggle.setAttribute("aria-expanded", "true");
      links.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close the menu whenever a nav link is chosen.
    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Close on Escape for keyboard users.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    // If the viewport grows past the mobile breakpoint, reset state.
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initStickyHeader();
    initMobileMenu();
  });
})();
