/* ==========================================================================
   Jolly Panda Web — brochure.js
   "Download the price list": builds the PowerPoint brochure (Persian or English) in the
   visitor's browser from the brochure template (assets/brochure/...pptx) with the CURRENT
   prices — data/plans.json (+ discounts) and data/rate.json (USD -> IRR) — so the file is
   always as up to date as the website. Nothing is stored on a server.

   Persian file:  right-to-left, prices in Rial (US dollars while no rate is available)
   English file:  mirrored left-to-right, prices in US dollars
   Both show the regular price struck through, the discounted price, the discount label
   and the date the prices were last updated. Uses the vendored js/vendor/jszip.min.js.
   ========================================================================== */
(function () {
  "use strict";
  var JP = window.JP;
  var A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  var P = "http://schemas.openxmlformats.org/presentationml/2006/main";
  var XML = "http://www.w3.org/XML/1998/namespace";
  var EMU = 914400;
  var TEMPLATE = "assets/brochure/JollyPanda_Website_Plans_template.pptx";
  var PLAN_ORDER = ["custom", "special", "economy"];          // left -> right in the (right-to-left) template

  var T = {
    fa: {
      cover_title: "پلن‌ها و تعرفه‌های طراحی و پیاده‌سازی وبسایت",
      cover_types: "بلاگ · پورتفولیو · شرکتی · آموزشگاهی · خبری · فروشگاهی",
      cover_plans: "سه پلن اکونومی، ویژه و اختصاصی برای هر نوع وبسایت",
      cmp_title: "مقایسه قیمت پلن‌ها",
      cmp_sub_rial: "قیمت شروع هر پلن بر حسب ریال (با نرخ روز دلار)؛ جزئیات هر نوع وبسایت در اسلایدهای بعد",
      cmp_sub_usd: "قیمت شروع هر پلن بر حسب دلار آمریکا؛ جزئیات هر نوع وبسایت در اسلایدهای بعد",
      type_hdr: "نوع وبسایت", feat_hdr: "ویژگی", price_row: "قیمت شروع", badge_special: "پیشنهاد ویژه",
      off: "{p}٪ تخفیف", off_all: "{p}٪ تخفیف روی همه پلن‌ها", off_up: "تا {p}٪ تخفیف",
      updated: "آخرین بروزرسانی قیمت: {d}",
      end_title: "آماده شروع هستید؟",
      end_sub: "قیمت نهایی در جلسه مشاوره با تیم Jolly Panda تعیین می‌شود",
      end_1: "قیمت‌ها نقطه شروع هر پلن هستند",
      end_1_off: "قیمت‌ها نقطه شروع هر پلن هستند و تخفیف روی آن‌ها اعمال شده است",
      end_2: "هزینه دامنه و هاست جدا از پلن‌ها محاسبه می‌شود",
      end_3: "همه پلن‌ها شامل طراحی واکنش‌گرا (موبایل و تبلت) و گواهی SSL هستند",
    },
    en: {
      cover_title: "Website design & development plans and prices",
      cover_types: "Blog · Portfolio · Corporate · Educational · News · Online store",
      cover_plans: "Three plans — Economy, Special and Custom — for every website type",
      cmp_title: "Plan price comparison",
      cmp_sub_rial: "",
      cmp_sub_usd: "Starting price of each plan in US dollars; details for each website type on the following slides",
      type_hdr: "Website type", feat_hdr: "Feature", price_row: "Starting price", badge_special: "Special offer",
      off: "{p}% off", off_all: "{p}% off all plans", off_up: "Up to {p}% off",
      updated: "Prices last updated: {d}",
      end_title: "Ready to get started?",
      end_sub: "The final price is set in a consultation with the Jolly Panda team",
      end_1: "Prices are the starting point of each plan",
      end_1_off: "Prices are the starting point of each plan, with the discount already applied",
      end_2: "Domain and hosting costs are charged separately from the plans",
      end_3: "All plans include responsive design (mobile and tablet) and an SSL certificate",
    },
  };

  /* ---------------------------------------------------------------- tiny DOM helpers */
  function kids(node, ns, local) {
    var out = [];
    for (var c = node.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.namespaceURI === ns && c.localName === local) out.push(c);
    return out;
  }
  function kid(node, ns, local) { return kids(node, ns, local)[0] || null; }
  function all(node, ns, local) { return Array.prototype.slice.call(node.getElementsByTagNameNS(ns, local)); }
  function ensure(node, ns, qname, first) {
    var local = qname.split(":")[1], f = kid(node, ns, local);
    if (f) return f;
    f = node.ownerDocument.createElementNS(ns, qname);
    if (first && node.firstChild) node.insertBefore(f, node.firstChild); else node.appendChild(f);
    return f;
  }

  function shapeByName(doc, name) {
    var c = all(doc, P, "cNvPr").filter(function (n) { return n.getAttribute("name") === name; })[0];
    if (!c) throw new Error("brochure template: shape not found: " + name);
    return c.parentNode.parentNode;                                  // nvXxPr -> sp | pic | graphicFrame
  }
  function xfrmOf(shape) {
    var spPr = kid(shape, P, "spPr");
    return spPr ? kid(spPr, A, "xfrm") : kid(shape, P, "xfrm");      // graphicFrame has <p:xfrm>
  }
  function geom(shape) {
    var x = xfrmOf(shape), off = kid(x, A, "off"), ext = kid(x, A, "ext");
    return { x: +off.getAttribute("x"), cx: +ext.getAttribute("cx"), off: off, ext: ext };
  }
  function nextId(doc) { return Math.max.apply(null, all(doc, P, "cNvPr").map(function (n) { return +n.getAttribute("id") || 0; })) + 1; }
  function cloneShape(doc, name, newName, left, width) {
    var src = shapeByName(doc, name), el = src.cloneNode(true);
    src.parentNode.insertBefore(el, src.nextSibling);
    var c = all(el, P, "cNvPr")[0]; c.setAttribute("id", String(nextId(doc))); c.setAttribute("name", newName);
    var g = geom(el);
    if (left != null) g.off.setAttribute("x", String(Math.round(left)));
    if (width != null) g.ext.setAttribute("cx", String(Math.round(width)));
    return el;
  }

  /* ---------------------------------------------------------------- text editing (formatting of the template is kept) */
  function runSize(p) {
    var r = kid(p, A, "r"), rpr = r && kid(r, A, "rPr");
    return rpr && rpr.getAttribute("sz") ? +rpr.getAttribute("sz") / 100 : 14;
  }
  function setRuns(p, pieces) {
    var runs = kids(p, A, "r"), base = runs[0].cloneNode(true);
    runs.forEach(function (r) { p.removeChild(r); });
    var end = kid(p, A, "endParaRPr");
    pieces.forEach(function (pc) {
      var r = base.cloneNode(true), rpr = kid(r, A, "rPr"), o = pc[1] || {};
      if (o.sz != null) rpr.setAttribute("sz", String(Math.round(o.sz * 100)));
      if (o.bold != null) rpr.setAttribute("b", o.bold ? "1" : "0");
      if (o.strike) rpr.setAttribute("strike", "sngStrike");
      if (o.color) {
        var fill = kid(rpr, A, "solidFill"), clr = fill && kid(fill, A, "srgbClr");
        if (clr) clr.setAttribute("val", o.color);
      }
      var t = kid(r, A, "t"); t.textContent = pc[0];
      if (/^\s|\s$/.test(pc[0])) t.setAttributeNS(XML, "xml:space", "preserve");
      if (end) p.insertBefore(r, end); else p.appendChild(r);
    });
  }
  function setText(txBody, text) {
    var ps = kids(txBody, A, "p");
    ps.slice(1).forEach(function (x) { txBody.removeChild(x); });
    setRuns(ps[0], [[text, {}]]);
  }
  function txOf(shape) { return kid(shape, P, "txBody"); }
  function textOf(doc, name, text) { setText(txOf(shapeByName(doc, name)), text); }
  function cellBody(tc) { return kid(tc, A, "txBody"); }
  function cellText(tc, text) { setText(cellBody(tc), text); }
  function centerAlign(shape) {
    kids(txOf(shape), A, "p").forEach(function (p) { ensure(p, A, "a:pPr", true).setAttribute("algn", "ctr"); });
  }

  /* ---------------------------------------------------------------- build */
  function build(lang, data, zip, W) {
    var t = T[lang], plans = data.plans, rate = data.rate ? data.rate.rateRial : null;
    var pickL = function (f) { return f ? (f[lang] || f.en || "") : ""; };
    var nf = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 0 });
    var num = function (n) { return nf.format(n); };
    var planById = {}; plans.plans.forEach(function (p) { planById[p.id] = p; });
    var pct = function (ty, pid) { return JP.pricing.pct(ty, planById[pid], data); };
    var disc = JP.pricing.discounted;
    var money = function (usd) {
      if (lang === "fa") return rate ? num(Math.round(usd * rate)) + " ریال" : num(usd) + " دلار";
      return "$" + num(usd);
    };

    var iso = (data.rate && data.rate.fetchedAt) || plans.listUpdated;
    var dateStr = "";
    if (iso) {
      var dt = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { dateStyle: "long", timeZone: "Asia/Tehran" }).format(new Date(iso));
      dateStr = t.updated.replace("{d}", dt);
    }
    var pcts = JP.pricing.allPcts(data), maxP = Math.max.apply(null, pcts), minP = Math.min.apply(null, pcts);
    var badge = !(maxP > 0) ? "" : (t[minP === maxP ? "off_all" : "off_up"]).replace("{p}", num(maxP));

    function priceCell(tc, usd, p, base) {
      var body = cellBody(tc), ps = kids(body, A, "p");
      ps.slice(1).forEach(function (x) { body.removeChild(x); });
      var main = ps[0];
      var size = (lang === "fa" && rate) ? (base >= 20 ? 18 : base) : base;
      if (!p) { setRuns(main, [[money(disc(usd, p)), { sz: size }]]); return; }
      var small = Math.max(9.5, Math.round(size * 0.55 * 10) / 10);
      var top = main.cloneNode(true);
      setRuns(top, [[money(usd), { sz: small, strike: true, color: "8A7268", bold: false }], ["   ", { sz: small }], [t.off.replace("{p}", num(p)), { sz: small, color: "C4570D", bold: true }]]);
      setRuns(main, [[money(disc(usd, p)), { sz: size }]]);
      body.insertBefore(top, main);
    }
    function addDateFooter(doc, srcName) {
      if (!dateStr) return;
      var el = cloneShape(doc, srcName, "Date footer", (W - 5.2 * EMU) / 2, 5.2 * EMU);
      centerAlign(el); setText(txOf(el), dateStr);
    }
    function addBadge(doc, rightEdge) {
      if (!badge) return;
      var w = 2.7 * EMU, left = rightEdge - w;
      var bg = cloneShape(doc, "Shape 2", "Discount badge", left, w);
      var f = all(bg, A, "srgbClr")[0]; if (f) f.setAttribute("val", "FCDD4E");
      var tx = cloneShape(doc, "Text 3", "Discount badge text", left, w);
      all(tx, A, "srgbClr").forEach(function (c) { c.setAttribute("val", "3A2415"); });
      setText(txOf(tx), badge);
    }

    /* ---- parse slides ---- */
    var docs = [], parser = new DOMParser();
    var files = [];
    for (var i = 1; i <= 9; i++) files.push("ppt/slides/slide" + i + ".xml");
    return Promise.all(files.map(function (f) { return zip.file(f).async("string"); })).then(function (xmls) {
      docs = xmls.map(function (x) { return parser.parseFromString(x, "application/xml"); });
      var doc;

      // 1 cover
      doc = docs[0];
      textOf(doc, "Text 2", t.cover_title);
      var tp = kid(txOf(shapeByName(doc, "Text 3")), A, "p");
      setRuns(tp, [[t.cover_types, { sz: runSize(tp) - (lang === "en" ? 1.5 : 0) }]]);
      textOf(doc, "Text 4", t.cover_plans);

      // 2 comparison table
      doc = docs[1];
      textOf(doc, "Text 0", t.cmp_title);
      textOf(doc, "Text 1", lang === "fa" && rate ? t.cmp_sub_rial : t.cmp_sub_usd);
      textOf(doc, "Text 3", t.badge_special);
      var gf = shapeByName(doc, "Table 0"), tbl = all(gf, A, "tbl")[0], rows = kids(tbl, A, "tr");
      var hdr = kids(rows[0], A, "tc");
      PLAN_ORDER.forEach(function (pid, i) { cellText(hdr[i], pickL(planById[pid].name)); });
      cellText(hdr[3], t.type_hdr);
      plans.types.forEach(function (ty, r) {
        var tcs = kids(rows[r + 1], A, "tc");
        PLAN_ORDER.forEach(function (pid, i) {
          priceCell(tcs[i], ty.rows[pid].price, pct(ty, pid), runSize(kid(cellBody(tcs[i]), A, "p")));
        });
        cellText(tcs[3], pickL(ty.name));
      });
      rows.slice(1).forEach(function (tr) { tr.setAttribute("h", String(Math.round(0.62 * EMU))); });
      var g = geom(gf); addBadge(doc, g.x + g.cx);
      addDateFooter(doc, "Text 4");

      // 3..8 website types
      plans.types.forEach(function (ty, idx) {
        var d = docs[2 + idx];
        textOf(d, "Text 0", pickL(ty.title));
        textOf(d, "Text 1", pickL(ty.tagline));
        textOf(d, "Text 3", t.badge_special);
        var f = shapeByName(d, "Table 0"), tb = all(f, A, "tbl")[0], rs = kids(tb, A, "tr");
        var h = kids(rs[0], A, "tc");
        PLAN_ORDER.forEach(function (pid, i) { cellText(h[i], pickL(planById[pid].name)); });
        cellText(h[3], t.feat_hdr);
        plans.features.forEach(function (ft, r) {
          var tcs = kids(rs[r + 1], A, "tc");
          var label = ft.id === "structure" && ty.structureLabel ? ty.structureLabel : ft.label;
          PLAN_ORDER.forEach(function (pid, i) { cellText(tcs[i], pickL(ty.rows[pid][ft.id])); });
          cellText(tcs[3], pickL(label));
        });
        var last = kids(rs[rs.length - 1], A, "tc");
        PLAN_ORDER.forEach(function (pid, i) {
          priceCell(last[i], ty.rows[pid].price, pct(ty, pid), runSize(kid(cellBody(last[i]), A, "p")));
        });
        cellText(last[3], t.price_row);
        rs[rs.length - 1].setAttribute("h", String(Math.round(0.88 * EMU)));
        var gg = geom(f); addBadge(d, gg.x + gg.cx);
        addDateFooter(d, "Text 4");
      });

      // 9 closing
      doc = docs[8];
      textOf(doc, "Text 1", t.end_title);
      textOf(doc, "Text 2", t.end_sub);
      textOf(doc, "Text 4", maxP > 0 ? t.end_1_off : t.end_1);
      textOf(doc, "Text 6", t.end_2);
      textOf(doc, "Text 8", t.end_3);
      if (dateStr) addDateFooter(doc, "Text 11");

      if (lang === "en") docs.forEach(function (d) { mirror(d, W); });

      var ser = new XMLSerializer();
      docs.forEach(function (d, i) {
        var s = ser.serializeToString(d);
        if (s.indexOf("<?xml") !== 0) s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s;
        zip.file(files[i], s);
      });
    });
  }

  /* ---------------------------------------------------------------- English: mirror a slide left <-> right */
  function setLang(el) {
    if ((el.getAttribute("lang") || "").indexOf("fa") === 0) el.setAttribute("lang", "en-US");
    el.removeAttribute("altLang");
  }
  function mirror(doc, W) {
    var tree = all(doc, P, "spTree")[0];
    var shapes = [];
    for (var c = tree.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && c.namespaceURI === P && ["sp", "pic", "graphicFrame"].indexOf(c.localName) !== -1) shapes.push(c);
    }
    // 1) shapes that start on the left half keep right-aligned text after mirroring (decided on the ORIGINAL positions)
    var leftHalf = shapes.filter(function (s) { var g = geom(s); return g.x + g.cx / 2 < W / 2; });
    // 2) tables: reverse the columns, left-to-right paragraphs
    shapes.forEach(function (s) {
      if (s.localName !== "graphicFrame") return;
      var tbl = all(s, A, "tbl")[0], grid = kid(tbl, A, "tblGrid");
      var cols = kids(grid, A, "gridCol"); cols.forEach(function (x) { grid.removeChild(x); }); cols.reverse().forEach(function (x) { grid.appendChild(x); });
      kids(tbl, A, "tr").forEach(function (tr) {
        var tcs = kids(tr, A, "tc"); tcs.forEach(function (x) { tr.removeChild(x); });
        tcs.reverse().forEach(function (x) { tr.appendChild(x); });
      });
      all(tbl, A, "p").forEach(function (p) {
        var ppr = kid(p, A, "pPr");
        if (ppr) { if (ppr.getAttribute("rtl") === "1") ppr.setAttribute("rtl", "0"); if (ppr.getAttribute("algn") === "r") ppr.setAttribute("algn", "l"); }
      });
    });
    // 3) text boxes: alignment
    shapes.forEach(function (s) {
      if (s.localName !== "sp") return;
      var tx = txOf(s); if (!tx || !tx.textContent.trim()) return;
      var moved = leftHalf.indexOf(s) !== -1;
      kids(tx, A, "p").forEach(function (p) {
        var ppr = ensure(p, A, "a:pPr", true), a = ppr.getAttribute("algn");
        if (a === "r") ppr.setAttribute("algn", "l");
        else if ((a === null || a === "l") && moved) ppr.setAttribute("algn", "r");
      });
    });
    // 4) positions, paragraph direction, language tags
    shapes.forEach(function (s) { var g = geom(s); g.off.setAttribute("x", String(Math.round(W - g.x - g.cx))); });
    all(doc, A, "p").forEach(function (p) { var ppr = kid(p, A, "pPr"); if (ppr && ppr.getAttribute("rtl") === "1") ppr.setAttribute("rtl", "0"); });
    all(doc, A, "rPr").concat(all(doc, A, "endParaRPr")).forEach(setLang);
  }

  /* ---------------------------------------------------------------- loading + download */
  var zipLibPromise = null, templatePromise = null;
  function loadZipLib() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!zipLibPromise) zipLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = JP.root + "js/vendor/jszip.min.js"; s.onload = function () { resolve(window.JSZip); };
      s.onerror = function () { zipLibPromise = null; reject(new Error("could not load jszip")); };
      document.head.appendChild(s);
    });
    return zipLibPromise;
  }
  function loadTemplate() {
    if (!templatePromise) templatePromise = fetch(JP.root + TEMPLATE).then(function (r) {
      if (!r.ok) throw new Error("template " + r.status); return r.arrayBuffer();
    }).catch(function (e) { templatePromise = null; throw e; });
    return templatePromise;
  }

  JP.brochure = {
    /** Builds the file for "fa" or "en" and returns a Blob. */
    make: function (lang) {
      return Promise.all([JP.pricing.load(), JP.ready, loadZipLib(), loadTemplate()]).then(function (r) {
        var data = r[0], JSZip = r[2];
        return JSZip.loadAsync(r[3]).then(function (zip) {
          return zip.file("ppt/presentation.xml").async("string").then(function (px) {
            var W = +/<p:sldSz[^>]*\bcx="(\d+)"/.exec(px)[1];
            return build(lang, data, zip, W);
          }).then(function () {
            return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
          });
        });
      });
    },
    download: function (lang) {
      return JP.brochure.make(lang).then(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "Jolly-Panda-Web-Price-List-" + lang + ".pptx";
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      });
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-brochure]").forEach(function (btn) {
      var label = btn.querySelector("[data-label]"), orig = label.textContent;
      var status = document.getElementById("brochureStatus");
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        btn.disabled = true; label.textContent = JP.t("packages.download.preparing"); if (status) status.hidden = true;
        JP.brochure.download(btn.getAttribute("data-brochure")).catch(function (e) {
          console.error("[brochure.js]", e);
          if (status) { status.textContent = JP.t("packages.download.error"); status.hidden = false; }
        }).then(function () { btn.disabled = false; label.textContent = orig; });
      });
    });
  });
})();
