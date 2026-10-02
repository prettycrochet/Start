/* PrettyCrochet – Handy-Menü und Seitensuche (ohne Cookies, ohne externe Dienste) */
(function () {
  "use strict";
  var me = document.currentScript;
  var ROOT = (me && me.dataset.root) || "";
  var LANG = (me && me.dataset.lang) || document.documentElement.lang || "de";
  var T = LANG === "en"
    ? { popular: "Popular", results: "Results", none: "No results for", tip: "Try “pumpkin”, “magic ring” or “beginner”." ,
        types: { pattern: "Pattern", blog: "Blog", learn: "Learn", tool: "Tool", page: "Page" } }
    : { popular: "Beliebt", results: "Ergebnisse", none: "Keine Treffer für", tip: "Probier zum Beispiel „Kürbis“, „Magic Ring“ oder „Anfänger“.",
        types: { pattern: "Anleitung", blog: "Blog", learn: "Häkeln lernen", tool: "Werkzeug", page: "Seite" } };

  /* ── Handy-Menü ── */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("mobile-menu");
  function setMenu(open) {
    if (!toggle || !menu) return;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
    toggle.querySelector(".i-open").style.display = open ? "none" : "";
    toggle.querySelector(".i-close").style.display = open ? "" : "none";
    document.body.classList.toggle("menu-open", open);
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () { setMenu(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1140) setMenu(false); });
  }

  /* ── Aufklappbare Abschnitte ── */
  // Sprungziel in einem zugeklappten Abschnitt: Abschnitt öffnen
  function openTarget() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!el) return;
    for (var d = el; d; d = d.parentElement) { if (d.tagName === "DETAILS") d.open = true; }
  }
  openTarget();
  window.addEventListener("hashchange", openTarget);
  // Beim Drucken alles ausklappen, danach Zustand wiederherstellen
  var closedForPrint = [];
  window.addEventListener("beforeprint", function () {
    closedForPrint = [].filter.call(document.querySelectorAll("details:not([open])"), function (d) { d.open = true; return true; });
  });
  window.addEventListener("afterprint", function () { closedForPrint.forEach(function (d) { d.open = false; }); closedForPrint = []; });

  /* ── Suche ── */
  var overlay = document.getElementById("search");
  if (!overlay) return;
  var input = overlay.querySelector("input");
  var list = overlay.querySelector(".search-results");
  var DATA = ((window.PC_SEARCH || {})[LANG]) || [];
  var lastFocus = null, active = -1, hits = [];

  function norm(s) {
    return (s || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  DATA.forEach(function (d) { d._t = norm(d.t); d._d = norm(d.d); d._all = norm(d.t + " " + d.d + " " + (d.k || "")); });

  function search(q) {
    var words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return DATA.filter(function (d) { return d.p; }).sort(function (a, b) { return a.p - b.p; });
    return DATA.map(function (d) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (d._all.indexOf(w) === -1) return null;
        if (d._t.indexOf(w) === 0) score += 6; else if (d._t.indexOf(w) !== -1) score += 4; else if (d._d.indexOf(w) !== -1) score += 2; else score += 1;
      }
      if (d.c === "pattern" || d.c === "learn") score += .5;
      return { d: d, s: score };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.d; }).slice(0, 10);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function render() {
    var q = input.value.trim();
    hits = search(q);
    active = hits.length ? 0 : -1;
    if (!hits.length) {
      list.innerHTML = '<p class="search-empty">' + T.none + " „" + esc(q) + "“. " + T.tip + "</p>";
      return;
    }
    list.innerHTML = '<p class="search-group">' + (q ? T.results : T.popular) + "</p>" + hits.map(function (d, i) {
      return '<a class="search-hit' + (i === 0 ? " is-active" : "") + '" href="' + ROOT + d.u + '">' +
        "<em>" + (T.types[d.c] || "") + "</em><strong>" + esc(d.t) + "</strong><span>" + esc(d.d) + "</span></a>";
    }).join("");
  }

  function openSearch(q) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("search-open");
    if (typeof q === "string") input.value = q;
    render();
    setTimeout(function () { input.focus(); input.select(); }, 0);
  }
  function closeSearch() {
    overlay.hidden = true;
    document.body.classList.remove("search-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function move(delta) {
    var links = list.querySelectorAll(".search-hit");
    if (!links.length) return;
    active = (active + delta + links.length) % links.length;
    links.forEach(function (l, i) { l.classList.toggle("is-active", i === active); });
    links[active].scrollIntoView({ block: "nearest" });
  }

  document.querySelectorAll("[data-search-open]").forEach(function (b) {
    b.addEventListener("click", function () { setMenu(false); openSearch(); });
  });
  document.querySelectorAll("[data-search-query]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); openSearch(b.dataset.searchQuery); });
  });
  document.querySelectorAll("form[data-search-form]").forEach(function (f) {
    var field = f.querySelector("input");
    f.addEventListener("submit", function (e) { e.preventDefault(); openSearch(field.value); });
    field.addEventListener("input", function () { openSearch(field.value); field.value = ""; });
  });
  overlay.querySelector(".search-close").addEventListener("click", closeSearch);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSearch(); });
  input.addEventListener("input", render);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { var a = list.querySelectorAll(".search-hit")[active]; if (a) { e.preventDefault(); location.href = a.href; } }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!overlay.hidden) closeSearch(); else if (menu && !menu.hidden) { setMenu(false); toggle.focus(); } }
    // Fokus bleibt im geöffneten Suchfenster
    if (e.key === "Tab" && !overlay.hidden) {
      var f = [].slice.call(overlay.querySelectorAll("input, button, a[href]"));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    var tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "/" && overlay.hidden && tag !== "input" && tag !== "textarea" && tag !== "select") { e.preventDefault(); openSearch(); }
  });
})();
