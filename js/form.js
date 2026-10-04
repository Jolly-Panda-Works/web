/* ==========================================================================
   Jolly Panda Web — form.js
   Validates the request form and sends TWO emails through EmailJS
   (https://www.emailjs.com — works from a static GitHub Pages site):
     1. a notification to the studio (template: studioTemplateId), and
     2. a confirmation to the visitor that contains the ENGLISH PRE-CONTRACT
        pre-filled with their request (template: confirmTemplateId).
   Both templates receive the same parameters; the template HTML lives in
   /email-templates. The pre-contract is always English, whatever the site
   language. If EmailJS is not configured yet, the form falls back to opening
   the visitor's mail app with the request ready to send.
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var cfg = window.JP_CONFIG || {};
  var data = null;

  var EN_DOMAIN = {
    yes: "Has a domain and hosting",
    no: "Needs help with domain and hosting",
    unsure: "Not sure about domain and hosting",
  };

  function $(id) { return document.getElementById(id); }
  function isConfigured() {
    var e = cfg.email || {};
    return ["serviceId", "publicKey", "studioTemplateId", "confirmTemplateId"].every(function (k) {
      return e[k] && String(e[k]).indexOf("YOUR_") !== 0;
    });
  }
  function typeById(id) { return data.plans.types.filter(function (t) { return t.id === id; })[0]; }
  function planById(id) { return data.plans.plans.filter(function (p) { return p.id === id; })[0]; }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- summary card ---------- */
  function paintSummary() {
    var none = $("summaryNone"), list = $("summaryList");
    if (!none || !list) return;
    if (!JP.selection || !data) { none.hidden = false; list.hidden = true; return; }
    var ty = typeById(JP.selection.type), pl = planById(JP.selection.plan);
    $("sumType").textContent = JP.pick(ty.name);
    $("sumPlan").textContent = JP.pick(pl.name);
    $("sumPrice").textContent = JP.pricing.plain(ty.rows[pl.id].price, data);
    none.hidden = true; list.hidden = false;
  }

  /* ---------- validation ---------- */
  function setError(field, msg) {
    var box = $("err-" + field), input = $("f-" + field);
    if (!box || !input) return;
    var wrap = input.closest(".field");
    box.textContent = msg || ""; box.hidden = !msg;
    if (wrap) wrap.classList.toggle("has-error", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function validate() {
    var ok = true, first = null;
    function bad(field, key) { setError(field, JP.t(key)); ok = false; if (!first) first = $("f-" + field); }
    var name = $("f-name").value.trim(), email = $("f-email").value.trim(), msg = $("f-message").value.trim();
    setError("name"); setError("email"); setError("message"); setError("consent");
    if (!name) bad("name", "form.err.required");
    if (!email) bad("email", "form.err.required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad("email", "form.err.email");
    if (!msg) bad("message", "form.err.required");
    if (!$("f-consent").checked) bad("consent", "form.err.consent");
    if (first) first.focus();
    return ok;
  }

  /* ---------- email parameters (shared by both templates) ---------- */
  function reference() {
    var d = new Date(), pad = function (n) { return String(n).padStart(2, "0"); };
    var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "JP-" + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "-" + rnd;
  }

  function buildParams() {
    var ty = typeById(JP.selection.type), pl = planById(JP.selection.plan), row = ty.rows[pl.id];
    var email = $("f-email").value.trim(), name = $("f-name").value.trim();
    var rate = data.rate;
    var pct = JP.pricing.discountPercent(data);
    var payUsd = JP.pricing.discounted(row.price, data);      // price after the discount
    var fmt = function (n) { return new Intl.NumberFormat("en-US").format(n); };
    var rialNote = "";
    if (rate) {
      var rial = Math.round(payUsd * rate.rateRial);
      rialNote = "Indicative Rial equivalent on the request date: " + new Intl.NumberFormat("en-US").format(rial) +
        " IRR (1 USD = " + new Intl.NumberFormat("en-US").format(rate.rateRial) + " IRR). The payment currency and exchange rate are confirmed in the final contract.";
    }
    return {
      reference: reference(),
      request_date: new Date().toISOString().slice(0, 10),
      site_language: JP.lang === "fa" ? "Persian" : "English",
      name: name,
      email: email,
      to_email: email,           // recipient of the CONFIRMATION email (the visitor)
      to_name: name,
      reply_to: cfg.contactEmail || "",
      studio_email: cfg.contactEmail || "",
      phone: $("f-phone").value.trim() || "-",
      business: $("f-business").value.trim() || "-",
      domain_status: EN_DOMAIN[$("f-domain").value] || EN_DOMAIN.unsure,
      project_message: $("f-message").value.trim(),
      website_type: ty.name.en,
      plan_name: pl.name.en,
      price_usd: "USD " + fmt(payUsd),
      price_list_usd: "USD " + fmt(row.price),
      discount_percent: pct ? String(pct) : "0",
      discount_note: pct ? pct + "% discount applied to the regular price of USD " + fmt(row.price) + "." : "",
      rial_note: rialNote,
      scope_structure: row.structure.en,
      scope_structure_label: (ty.structureLabel ? ty.structureLabel.en : "Structure & pages"),
      scope_design: row.design.en,
      scope_features: row.features.en,
      scope_seo: row.seo.en,
      scope_support: row.support.en,
      scope_delivery: row.delivery.en,
      intro_fa: JP.lang === "fa" ? JP.t("form.mail.faNote") : "",
    };
  }

  function sendEmailJS(templateId, params) {
    var e = cfg.email;
    return fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: e.serviceId, template_id: templateId, user_id: e.publicKey, template_params: params }),
    }).then(function (res) {
      if (res.ok) return;
      return res.text().then(function (t) {
        var hint = /recipient/i.test(t) ? " → open this template in EmailJS ▸ Settings and set \"To Email\" to {{to_email}}" : "";
        throw new Error("EmailJS " + res.status + ": " + t + " [template " + templateId + "]" + hint);
      });
    });
  }

  function mailtoFallback(p) {
    var lines = [
      "Reference: " + p.reference, "Name: " + p.name, "Email: " + p.email, "Phone/Telegram: " + p.phone, "Business: " + p.business,
      "Website type: " + p.website_type, "Plan: " + p.plan_name, "Starting price: " + p.price_usd, "Domain/hosting: " + p.domain_status, "", p.project_message,
    ];
    window.location.href = "mailto:" + (cfg.contactEmail || "") + "?subject=" +
      encodeURIComponent("Website request " + p.reference + " — " + p.website_type + " / " + p.plan_name) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  /* ---------- UI states ---------- */
  function showError(msg) { var b = $("formError"); b.textContent = msg; b.hidden = false; }
  function hideError() { $("formError").hidden = true; }
  function setBusy(busy) {
    var b = $("submitBtn");
    b.disabled = busy;
    b.firstElementChild.textContent = busy ? JP.t("form.sending") : JP.t("form.submit");
  }
  function showSuccess(text) {
    $("requestForm").hidden = true;
    $("summaryCard").hidden = true;
    $("successText").textContent = text;
    var box = $("formSuccess"); box.hidden = false; box.focus();
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onSubmit(ev) {
    ev.preventDefault();
    hideError();
    if ($("hp").value) { showSuccess(JP.t("form.ok.text", { email: $("f-email").value.trim() })); return; } // bot
    if (!validate()) return;
    if (!JP.selection) {
      showError(JP.t("form.err.noPackage"));
      var pk = $("packages"); if (pk) pk.scrollIntoView({ behavior: "smooth" });
      return;
    }
    var params = buildParams();

    if (!isConfigured()) {          // EmailJS not set up yet -> open the visitor's mail app
      console.warn("[form.js] EmailJS is not configured (js/config.js still has YOUR_… placeholders) — falling back to the mail app.");
      mailtoFallback(params);
      showSuccess(JP.t("form.ok.fallback", { email: cfg.contactEmail }));
      return;
    }

    // Both templates use {{to_email}} as their "To Email": the studio email gets the studio
    // address, the confirmation email gets the visitor's address.
    var studioParams = Object.assign({}, params, { to_email: cfg.contactEmail || "", to_name: "Jolly Panda Studio" });

    setBusy(true);
    sendEmailJS(cfg.email.studioTemplateId, studioParams)
      .then(function () { return delay(1200); })                      // EmailJS allows 1 request / second
      .then(function () { return sendEmailJS(cfg.email.confirmTemplateId, params).then(function () { return true; }, function (e) { console.warn("[form.js] confirmation failed", e); return false; }); })
      .then(function (confirmed) {
        showSuccess(JP.t(confirmed ? "form.ok.text" : "form.ok.textNoConfirm", { email: params.email }));
      })
      .catch(function (e) {
        console.error("[form.js] EmailJS request failed:", e && e.message ? e.message : e);
        showError(JP.t("form.err.send", { email: cfg.contactEmail }));
      })
      .then(function () { setBusy(false); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = $("requestForm");
    if (!form) return;
    Promise.all([JP.pricing.load(), JP.ready]).then(function (r) {
      data = r[0];
      paintSummary();
    });
    document.addEventListener("jp:selection", paintSummary);
    form.addEventListener("submit", onSubmit);
    ["name", "email", "message"].forEach(function (f) {
      $("f-" + f).addEventListener("input", function () { setError(f); });
    });
    $("f-consent").addEventListener("change", function () { setError("consent"); });
    $("anotherBtn").addEventListener("click", function () {
      $("formSuccess").hidden = true; $("requestForm").hidden = false; $("summaryCard").hidden = false;
      form.reset(); hideError();
    });
  });
})();
