/* PrettyCrochet – Interaktiver Lernpfad
   Die Inhalte (Lektionen, Quizfragen, Texte) stehen in window.LERNPFAD auf der jeweiligen Seite.
   Der Fortschritt wird nur im Browser gespeichert (localStorage). */
(function () {
  "use strict";

  var D = window.LERNPFAD;
  if (!D) return;
  var T = D.text;
  var LESSONS = D.lessons;
  var $ = function (id) { return document.getElementById(id); };

  /* ── Fortschritt ── */
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(D.storageKey)); } catch (e) {}
    if (!s || !Array.isArray(s.done)) s = { done: [], current: 0 };
    s.done = s.done.filter(function (i) { return i >= 0 && i < LESSONS.length; });
    if (typeof s.current !== "number" || !isUnlocked(s.current, s)) s.current = firstOpen(s);
    return s;
  }
  function save() {
    try { localStorage.setItem(D.storageKey, JSON.stringify(state)); } catch (e) {}
  }
  function isDone(i, s) { return (s || state).done.indexOf(i) !== -1; }
  function isUnlocked(i, s) { return i === 0 || isDone(i - 1, s); }
  function firstOpen(s) {
    for (var i = 0; i < LESSONS.length; i++) if (!isDone(i, s)) return i;
    return LESSONS.length - 1;
  }

  var state = load();

  /* ── Hilfsfunktionen ── */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function fmt(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
  }

  /* ── Fortschrittsanzeige ── */
  function renderProgress() {
    var n = state.done.length, total = LESSONS.length;
    $("lp-progress-text").textContent = fmt(T.progress, { done: n, total: total });
    var bar = $("lp-progress-bar");
    bar.style.width = Math.round(n / total * 100) + "%";
    bar.parentNode.setAttribute("aria-valuenow", n);
    bar.parentNode.setAttribute("aria-valuemax", total);
  }

  /* ── Lektionsliste ── */
  function renderList() {
    var list = $("lp-list");
    list.innerHTML = "";
    LESSONS.forEach(function (L, i) {
      var done = isDone(i), open = isUnlocked(i), active = i === state.current && !state.finished;
      var b = el("button", "lp-item" + (done ? " is-done" : "") + (active ? " is-active" : "") + (!open ? " is-locked" : ""));
      b.type = "button";
      var status = done ? T.statusDone : (open ? T.statusOpen : T.statusLocked);
      var icon = done ? "✓" : (open ? String(i + 1) : "🔒");
      b.innerHTML = '<span class="lp-item-num" aria-hidden="true">' + icon + '</span>' +
        '<span class="lp-item-text"><span class="lp-item-title">' + L.title + '</span>' +
        '<span class="lp-item-meta">' + L.duration + ' · ' + status + '</span></span>';
      b.setAttribute("aria-label", fmt(T.lessonLabel, { n: i + 1 }) + ": " + L.title + " – " + status);
      if (active) b.setAttribute("aria-current", "step");
      b.addEventListener("click", function () {
        if (!isUnlocked(i)) { flash(fmt(T.lockedMsg, { n: i })); return; }
        state.current = i; state.finished = false; save(); render(true);
      });
      list.appendChild(b);
    });
  }

  function flash(msg) {
    var f = $("lp-flash");
    f.textContent = msg;
    f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3500);
  }

  /* ── Lektion anzeigen ── */
  function renderLesson() {
    var box = $("lp-lesson");
    box.innerHTML = "";
    if (state.finished) { renderFinish(box); return; }

    var i = state.current, L = LESSONS[i];
    var head = el("div", "lp-head");
    head.appendChild(el("div", "label", fmt(T.lessonOf, { n: i + 1, total: LESSONS.length }) + " · " + L.duration));
    head.appendChild(el("h2", "", L.title));
    head.appendChild(el("p", "lp-intro", L.intro));
    box.appendChild(head);

    var goals = el("div", "lp-goals");
    goals.appendChild(el("h3", "", T.goals));
    var ul = el("ul");
    L.goals.forEach(function (g) { ul.appendChild(el("li", "", g)); });
    goals.appendChild(ul);
    box.appendChild(goals);

    var steps = el("ol", "lp-steps");
    L.steps.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("h3", "", s.title));
      li.appendChild(el("p", "", s.text));
      steps.appendChild(li);
    });
    box.appendChild(steps);

    if (L.more) box.appendChild(el("p", "lp-more", L.more));

    var practice = el("div", "lp-practice");
    practice.appendChild(el("h3", "", "✋ " + T.practice));
    practice.appendChild(el("p", "", L.practice));
    box.appendChild(practice);

    renderQuiz(box, i);
  }

  /* ── Quiz ── */
  function renderQuiz(box, i) {
    var L = LESSONS[i];
    var quiz = el("form", "lp-quiz");
    quiz.setAttribute("novalidate", "");
    quiz.appendChild(el("h3", "", "🧶 " + T.quizTitle));
    quiz.appendChild(el("p", "lp-quiz-hint", isDone(i) ? T.quizDoneHint : T.quizHint));

    L.quiz.forEach(function (q, qi) {
      var fs = el("fieldset", "lp-q");
      fs.appendChild(el("legend", "", (qi + 1) + ". " + q.q));
      q.a.forEach(function (ans, ai) {
        var id = "q" + i + "-" + qi + "-" + ai;
        var lab = el("label", "lp-opt");
        lab.setAttribute("for", id);
        var inp = el("input");
        inp.type = "radio"; inp.name = "q" + qi; inp.id = id; inp.value = ai;
        lab.appendChild(inp);
        lab.appendChild(el("span", "", ans));
        fs.appendChild(lab);
      });
      var fb = el("p", "lp-feedback");
      fb.hidden = true;
      fs.appendChild(fb);
      quiz.appendChild(fs);
    });

    var result = el("div", "lp-result");
    result.setAttribute("aria-live", "polite");
    var actions = el("div", "lp-actions");
    var check = el("button", "btn primary", T.check);
    check.type = "submit";
    actions.appendChild(check);
    quiz.appendChild(actions);
    quiz.appendChild(result);

    quiz.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var correct = 0, missing = 0;
      L.quiz.forEach(function (q, qi) {
        var fs = quiz.querySelectorAll(".lp-q")[qi];
        var chosen = quiz.querySelector('input[name="q' + qi + '"]:checked');
        var fb = fs.querySelector(".lp-feedback");
        fs.classList.remove("is-right", "is-wrong");
        fs.querySelectorAll(".lp-opt").forEach(function (o) { o.classList.remove("is-right", "is-wrong"); });
        if (!chosen) { missing++; fb.hidden = true; return; }
        var ok = Number(chosen.value) === q.c;
        if (ok) correct++;
        fs.classList.add(ok ? "is-right" : "is-wrong");
        chosen.parentNode.classList.add(ok ? "is-right" : "is-wrong");
        fb.hidden = false;
        fb.textContent = (ok ? "✓ " + T.right + " " : "✗ " + T.wrong + " ") + q.e;
      });
      result.innerHTML = "";
      if (missing) {
        result.appendChild(el("p", "lp-msg is-info", fmt(T.answerAll, { n: missing })));
        return;
      }
      if (correct === L.quiz.length) {
        if (!isDone(i)) state.done.push(i);
        save(); renderProgress(); renderList();
        var msg = el("div", "lp-msg is-success");
        msg.appendChild(el("p", "", "<strong>" + T.passedTitle + "</strong> " + fmt(T.passedText, { n: i + 1 })));
        var next = el("button", "btn sage", i + 1 < LESSONS.length ? fmt(T.next, { n: i + 2 }) : T.finishBtn);
        next.type = "button";
        next.addEventListener("click", function () {
          if (i + 1 < LESSONS.length) { state.current = i + 1; state.finished = false; }
          else { state.finished = true; }
          save(); render(true);
        });
        msg.appendChild(next);
        result.appendChild(msg);
        next.focus();
      } else {
        var m = el("div", "lp-msg is-retry");
        m.appendChild(el("p", "", fmt(T.retryText, { right: correct, total: L.quiz.length })));
        var again = el("button", "btn ghost", T.retry);
        again.type = "button";
        again.addEventListener("click", function () { renderLesson(); $("lp-lesson").querySelector(".lp-quiz").scrollIntoView({ behavior: "smooth", block: "start" }); });
        m.appendChild(again);
        result.appendChild(m);
      }
    });
    box.appendChild(quiz);
  }

  /* ── Abschluss ── */
  function renderFinish(box) {
    var done = state.done.length === LESSONS.length;
    box.appendChild(el("div", "lp-finish-icon", done ? "🎉" : "🧶"));
    box.appendChild(el("h2", "", done ? T.finishTitle : T.notYetTitle));
    box.appendChild(el("p", "lp-intro", done ? T.finishText : T.notYetText));
    if (done) {
      var grid = el("div", "lp-next-grid");
      D.projects.forEach(function (p) {
        var a = el("a", "lp-next-card", '<span class="lp-next-icon">' + p.icon + '</span><strong>' + p.title + '</strong><span>' + p.text + '</span>');
        a.href = p.href;
        grid.appendChild(a);
      });
      box.appendChild(grid);
    }
  }

  /* ── Zurücksetzen ── */
  $("lp-reset").addEventListener("click", function () {
    if (!confirm(T.resetConfirm)) return;
    state = { done: [], current: 0 };
    save(); render(true);
  });

  function render(scroll) {
    renderProgress();
    renderList();
    renderLesson();
    if (scroll) {
      var top = $("lp-app").getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  render(false);
})();
