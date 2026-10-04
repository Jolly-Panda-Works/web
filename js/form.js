/* ==========================================================================
   Jolly Panda Web — form.js
   Validates the request form and sends TWO emails through EmailJS
   (https://www.emailjs.com — works from a static GitHub Pages site):
     1. a notification to the studio (template: studioTemplateId), and
     2. a confirmation to the visitor that contains the PRE-CONTRACT pre-filled with their
        request: in Persian for visitors of the Persian site (template: confirmTemplateIdFa),
        in English otherwise (template: confirmTemplateId).
   The template HTML lives in
   /email-templates. If EmailJS is not configured yet, the form falls back to opening
   the visitor's mail app with the request ready to send.
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var cfg = window.JP_CONFIG || {};
  var data = null;

  var EN = {
    "form.mail.usd": "USD {n}",
    "form.mail.discountNote": "{pct}% discount applied to the regular price of {list}.",
    "form.mail.rialNote": "Indicative Rial equivalent on the request date: {rial} IRR (1 USD = {rate} IRR). The payment currency and exchange rate are confirmed in the final contract.",
    "form.mail.structureLabel": "Structure & pages",
  };
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
  function faTemplateReady() {
    var id = (cfg.email || {}).confirmTemplateIdFa;
    return JP.lang === "fa" && !!id && String(id).indexOf("YOUR_") !== 0;
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
    $("sumPrice").textContent = JP.pricing.plain(ty.rows[pl.id].price, data, JP.pricing.pct(ty, pl, data));
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

  /**
   * Parameters for the EmailJS templates.
   * lang "en": everything in English (studio notice, and the English pre-contract).
   * lang "fa": values in Persian for the Persian pre-contract — only used when the visitor is on
   *            the Persian site AND a Persian template id is configured (JP.dict is the Persian dictionary then).
   */
  function buildParams(lang) {
    var fa = lang === "fa";
    var ty = typeById(JP.selection.type), pl = planById(JP.selection.plan), row = ty.rows[pl.id];
    var email = $("f-email").value.trim(), name = $("f-name").value.trim();
    var rate = data.rate;
    var pct = JP.pricing.pct(ty, pl, data);
    var payUsd = JP.pricing.discounted(row.price, pct);       // price after the discount
    var nf = new Intl.NumberFormat(fa ? "fa-IR" : "en-US");
    var T = function (key, vars) { return fa ? JP.t(key, vars) : EN[key].replace(/\{(\w+)\}/g, function (m, k) { return vars[k]; }); };
    var usd = function (n) { return T("form.mail.usd", { n: nf.format(n) }); };

    var rialNote = "";
    if (rate) {
      rialNote = T("form.mail.rialNote", { rial: nf.format(Math.round(payUsd * rate.rateRial)), rate: nf.format(rate.rateRial) });
    }
    var now = new Date();
    var dateText = fa
      ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long", timeZone: "Asia/Tehran" }).format(now)
      : new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Tehran" }).format(now);
    var L = fa ? "fa" : "en";
    var domainKey = $("f-domain").value;
    return {
      reference: reference(),
      request_date: dateText,
      site_language: fa ? "Persian" : "English",
      name: name,
      email: email,
      to_email: email,           // recipient of the CONFIRMATION email (the visitor)
      to_name: name,
      reply_to: cfg.contactEmail || "",
      studio_email: cfg.contactEmail || "",
      signature_url: cfg.signatureUrl || "",
      phone: $("f-phone").value.trim() || "-",
      business: $("f-business").value.trim() || "-",
      domain_status: fa ? JP.t("form.domainLabels." + domainKey) : (EN_DOMAIN[domainKey] || EN_DOMAIN.unsure),
      project_message: $("f-message").value.trim(),
      website_type: ty.name[L],
      plan_name: pl.name[L],
      price_usd: usd(payUsd),
      price_list_usd: usd(row.price),
      discount_percent: pct ? nf.format(pct) : nf.format(0),
      discount_note: pct ? T("form.mail.discountNote", { pct: nf.format(pct), list: usd(row.price) }) : "",
      rial_note: rialNote,
      scope_structure: row.structure[L],
      scope_structure_label: ty.structureLabel ? ty.structureLabel[L] : T("form.mail.structureLabel", {}),
      scope_design: row.design[L],
      scope_features: row.features[L],
      scope_seo: row.seo[L],
      scope_support: row.support[L],
      scope_delivery: row.delivery[L],
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
    var useFa = faTemplateReady();                       // Persian site + Persian template configured -> Persian pre-contract
    if (JP.lang === "fa" && !useFa) console.warn("[form.js] No Persian pre-contract template configured (EMAILJS_CONFIRM_TEMPLATE_ID_FA) — sending the English one.");
    var params = buildParams("en");                      // studio notice + mail-app fallback: always English
    var confirmParams = useFa ? buildParams("fa") : params;
    var confirmTemplate = useFa ? cfg.email.confirmTemplateIdFa : cfg.email.confirmTemplateId;

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
      .then(function () { return sendEmailJS(confirmTemplate, confirmParams).then(function () { return true; }, function (e) { console.warn("[form.js] confirmation failed", e); return false; }); })
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
