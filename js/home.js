/* Jolly Panda Web — home.js: the "How much does it cost?" teaser (lowest starting price per plan). */
(function () {
  "use strict";
  var JP = window.JP;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(data) {
    var host = document.querySelector("[data-teaser]");
    if (!host) return;
    var plans = data.plans;
    host.textContent = "";

    plans.plans.forEach(function (plan) {
      var min = Math.min.apply(null, plans.types.map(function (t) { return t.rows[plan.id].price; }));
      var highlight = plans.highlightPlan === plan.id;

      var card = el("article", "teaser-card" + (highlight ? " teaser-card--highlight" : ""));
      if (highlight && plan.badge) card.appendChild(el("span", "teaser-card__badge", JP.pick(plan.badge)));
      card.appendChild(el("h3", "teaser-card__name", JP.pick(plan.name)));
      card.appendChild(el("p", "teaser-card__desc", JP.t("home.q5." + plan.id)));
      card.appendChild(el("span", "teaser-card__from", JP.t("pricing.from")));
      var p = el("div", "teaser-card__price");
      p.appendChild(JP.pricing.node(min, data, { chip: true }));
      card.appendChild(p);

      var link = el("a", "teaser-card__link");
      link.href = "packages.html#compare";
      link.appendChild(el("span", null, JP.t("home.q5.see")));
      var icon = document.createElement("span");
      icon.className = "dir-icon dir-icon--sm";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML =
        '<svg class="dir-icon__ltr" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<svg class="dir-icon__rtl" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      link.appendChild(icon);
      card.appendChild(link);
      host.appendChild(card);
    });
    if (window.JollyPandaAnimations) window.JollyPandaAnimations.observe(host);
  }

  document.addEventListener("DOMContentLoaded", function () {
    Promise.all([JP.pricing.load(), JP.ready]).then(function (r) {
      render(r[0]);
      JP.pricing.fillNotes();
      JP.pricing.fillBanners();
    }).catch(function (e) { console.error("[home.js]", e); });
  });
})();
