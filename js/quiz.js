/*
 * quiz.js — 1問の表示と採点（ヒントの階段）＋ 問題セットの進行
 *
 * ヒントの階段（仕様書6-4, 7-4）
 *   正解 → 短い理由 → 次へ
 *   不正解 → ヒント1 → 再挑戦 → ヒント2 → 再挑戦 → 解説（正解を表示）→ 類題 or 次へ
 *   ※選択肢が少ない問題は、残りが1つになった時点で解説へ（総当たりにしない）
 *   ※無限に不正解で止めない。「答えと解説を見る」はいつでも選べる（1回まちがえた後）
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui, h = ui.h, P = TS.problems;
  var KANA = ['ア', 'イ', 'ウ', 'エ', 'オ'];

  /**
   * problem：problems.js の形式（自習用の手作り問題も同じ形）
   * opts.onResolved(record)：正解 or 解説表示で1回だけ呼ばれる
   * opts.showTable：表を表示するか（既定 true）
   */
  function QuestionView(problem, opts) {
    opts = opts || {};
    var isChoice = problem.format === 'choice';
    var maxWrong = isChoice ? Math.min(3, problem.choices.length - 1) : 3;
    var rec = { uid: problem.uid, templateId: problem.templateId || 'study', category: problem.category || '確認', categoryName: problem.categoryName || '確認',
      prompt: problem.prompt, firstTry: false, attempts: 0, wrong: 0, hints: 0, solved: false, revealed: false, terms: problem.terms || [] };
    var resolved = false;
    var hintsShown = 0;

    var el = h('div', { class: 'qview' });
    var feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    var hintList = h('ol', { class: 'hint-list' });
    var hintBtn, giveUpBtn, answerArea, choiceBtns = [], numInput, checkBtn;
    var after = h('div', { class: 'after' });

    if (opts.showTable !== false && problem.scenario) {
      el.appendChild(ui.dataTable(problem.scenario, { caption: '問題の表：同じ労働量で作れる量（個）' }));
      el.appendChild(h('p', { class: 'muted small table-note' }, '表は「同じ労働量をすべてその商品に使ったときに作れる量」です（架空の数値）。'));
    }
    el.appendChild(h('p', { class: 'prompt' }, problem.prompt));

    if (isChoice) {
      answerArea = h('div', { class: 'choices', role: 'group', 'aria-label': '選択肢' });
      problem.choices.forEach(function (c, k) {
        var b = h('button', { type: 'button', class: 'choice', on: { click: function () { answerChoice(k, b); } } },
          h('span', { class: 'kana' }, KANA[k] || String(k + 1)), h('span', null, c));
        choiceBtns.push(b);
        answerArea.appendChild(b);
      });
    } else {
      var nid = 'ans-' + Math.random().toString(36).slice(2, 8);
      numInput = h('input', { type: 'text', inputmode: 'decimal', id: nid, class: 'input num-input', autocomplete: 'off', placeholder: '例：0.5 または 1/2',
        on: { keydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); answerNumber(); } } } });
      checkBtn = h('button', { type: 'button', class: 'btn btn-primary', on: { click: answerNumber } }, '答え合わせ');
      answerArea = h('div', { class: 'num-answer' },
        h('label', { for: nid, class: 'sr-only' }, '答え'),
        numInput, h('span', { class: 'unit' }, problem.unit || ''), checkBtn);
    }
    el.appendChild(answerArea);

    hintBtn = h('button', { type: 'button', class: 'btn btn-ghost', on: { click: function () { showHint(true); } } }, ui.icon('bulb'), 'ヒントを見る');
    giveUpBtn = h('button', { type: 'button', class: 'btn btn-ghost hidden', on: { click: function () { reveal(); } } }, '答えと解説を見る');
    el.appendChild(h('div', { class: 'help-row' }, hintBtn, giveUpBtn));
    el.appendChild(hintList);
    el.appendChild(feedback);
    el.appendChild(after);
    updateHintBtn();

    function updateHintBtn() {
      var left = problem.hints.length - hintsShown;
      hintBtn.lastChild.textContent = left > 0 ? 'ヒントを見る（あと' + left + '）' : 'ヒントはここまで';
      hintBtn.disabled = left <= 0 || resolved;
    }
    function showHint(voluntary) {
      if (hintsShown >= problem.hints.length) return;
      hintList.appendChild(h('li', null, h('strong', null, 'ヒント' + (hintsShown + 1) + '：'), problem.hints[hintsShown]));
      hintsShown++;
      rec.hints = hintsShown;
      updateHintBtn();
      if (voluntary) giveUpBtn.classList.remove('hidden');
    }

    function wrong(extraMsg) {
      rec.wrong++;
      giveUpBtn.classList.remove('hidden');
      if (rec.wrong >= maxWrong) { reveal(); return; }
      // 間違えた回数ぶんのヒントを出す（すでに見ているなら次のヒント）
      while (hintsShown < rec.wrong && hintsShown < problem.hints.length) showHint(false);
      ui.clear(feedback);
      feedback.className = 'feedback wrong';
      feedback.appendChild(h('p', null, h('strong', null, extraMsg || 'ちがうようです。'), 'ヒント' + Math.min(rec.wrong, problem.hints.length) + 'を読んで、もう一度考えてみよう。'));
    }

    function answerChoice(k, btn) {
      if (resolved) return;
      rec.attempts++;
      if (k === problem.answerIndex) { btn.classList.add('correct'); correct(); }
      else { btn.classList.add('wrong'); btn.disabled = true; btn.setAttribute('aria-label', btn.textContent + '（不正解）'); wrong(); }
    }

    function answerNumber() {
      if (resolved) return;
      var r = P.checkNumber(problem, numInput.value);
      if (r.parsed === null) {
        ui.clear(feedback); feedback.className = 'feedback info';
        feedback.appendChild(h('p', null, '数として読めませんでした。「0.5」や「1/2」のように入力してください。'));
        numInput.focus();
        return;
      }
      rec.attempts++;
      if (r.ok) { numInput.classList.add('ok'); correct(); }
      else { numInput.select(); wrong(r.close ? 'おしい！ 少しずれています。' : null); }
    }

    function lockInputs() {
      choiceBtns.forEach(function (b, k) { b.disabled = true; if (k === problem.answerIndex) b.classList.add('correct'); });
      if (numInput) { numInput.disabled = true; checkBtn.disabled = true; }
      hintBtn.disabled = true;
      giveUpBtn.classList.add('hidden');
    }

    function stepsBlock(open) {
      return h('details', { class: 'why', open: open },
        h('summary', null, ui.icon('bulb'), '途中式・解説'),
        h('ol', { class: 'steps' }, problem.steps.map(function (s) { return h('li', null, s); })),
        h('p', null, problem.explanation));
    }

    function correct() {
      resolved = true;
      rec.solved = true;
      rec.firstTry = rec.wrong === 0 && rec.hints === 0;
      lockInputs();
      ui.clear(feedback);
      feedback.className = 'feedback right';
      feedback.appendChild(h('p', null, ui.icon('check', 'ok-icon'), h('strong', null, '正解！ '), problem.reason || ''));
      if (!isChoice) feedback.appendChild(h('p', { class: 'small' }, '答え：' + problem.answer.toDisplay() + (problem.unit || '')));
      after.appendChild(stepsBlock(rec.wrong > 0));
      done();
    }

    function reveal() {
      if (resolved) return;
      resolved = true;
      rec.revealed = true;
      lockInputs();
      ui.clear(feedback);
      feedback.className = 'feedback reveal';
      var ans = isChoice ? (KANA[problem.answerIndex] + '「' + problem.choices[problem.answerIndex] + '」') : (problem.answer.toDisplay() + (problem.unit || ''));
      feedback.appendChild(h('p', null, h('strong', null, '答え：' + ans)));
      feedback.appendChild(h('p', { class: 'small' }, '解説を読んで、なぜそうなるか確認しよう。類題でもう一度ためすこともできます。'));
      after.appendChild(stepsBlock(true));
      done();
    }

    function done() { if (opts.onResolved) opts.onResolved(rec); }

    this.el = el;
    this.record = rec;
    this.focus = function () { var f = el.querySelector('.choice:not([disabled]), .num-input'); if (f) f.focus({ preventScroll: true }); };
  }

  /**
   * 問題セットの進行
   * opts.state：{specs, index, records}（保存から再開する場合）
   * opts.onSave(state)、opts.onFinish(state, problems)
   * opts.allowSimilar（既定 true）
   */
  function QuizRunner(container, opts) {
    var state = opts.state;
    var el = h('div', { class: 'quiz' });
    container.appendChild(el);

    function problemAt(i) {
      var sp = state.specs[i];
      return sp.custom ? sp.custom : P.buildProblem(sp);
    }

    function render() {
      ui.clear(el);
      if (state.index >= state.specs.length) { opts.onFinish(state); return; }
      var prob = problemAt(state.index);
      if (!prob) { // 生成できない（通常は起こらない）→ 飛ばす
        state.records[state.index] = { skipped: true };
        state.index++; save(); render(); return;
      }
      var total = state.specs.length, n = state.index + 1;
      var bar = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(n - 1), 'aria-label': '進み具合' },
        h('span', { style: { width: ((n - 1) / total * 100) + '%' } }));
      var meta = h('div', { class: 'q-meta' },
        h('span', { class: 'q-num' }, '問題 ' + n + ' / ' + total),
        h('span', { class: 'tag cat' }, prob.categoryName || ''),
        state.specs[state.index].similar ? h('span', { class: 'tag sim' }, '類題') : null,
        prob.minutes ? h('span', { class: 'muted small' }, '目安 ' + prob.minutes + '分') : null);
      var actions = h('div', { class: 'next-row' });
      var qv = new QuestionView(prob, {
        onResolved: function (rec) {
          rec.similar = !!state.specs[state.index].similar;
          state.records[state.index] = rec;
          save();
          if (opts.allowSimilar !== false && !rec.firstTry && !state.specs[state.index].custom) {
            actions.appendChild(h('button', {
              type: 'button', class: 'btn btn-outline', on: {
                click: function () {
                  var sp = P.similarSpec(state.specs[state.index], state.specs.length + 1);
                  sp.similar = true;
                  state.specs.splice(state.index + 1, 0, sp);
                  state.index++; save(); render();
                }
              }
            }, ui.icon('reset'), '類題でもう一度'));
          }
          var last = state.index === state.specs.length - 1;
          var nextBtn = h('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { state.index++; save(); render(); } } },
            last ? (opts.finishLabel || '結果を見る') : '次の問題へ', ui.icon('chevron'));
          actions.appendChild(nextBtn);
          nextBtn.focus({ preventScroll: true });
        }
      });
      ui.append(el, [bar, meta, h('div', { class: 'panel q-panel' }, qv.el), actions]);
      if (opts.scrollTop !== false) el.scrollIntoView({ block: 'start' });
      qv.focus();
    }
    function save() { if (opts.onSave) opts.onSave(state); }
    render();
  }

  /** 結果の集計 */
  function summarize(records) {
    var rs = records.filter(function (r) { return r && !r.skipped; });
    var s = { answered: rs.length, firstTry: 0, solved: 0, revealed: 0, hints: 0, retries: 0, similar: 0, byCat: {}, terms: [] };
    rs.forEach(function (r) {
      if (r.firstTry) s.firstTry++;
      if (r.solved) s.solved++;
      if (r.revealed) s.revealed++;
      if (r.similar) s.similar++;
      s.hints += r.hints || 0;
      s.retries += Math.max(0, (r.attempts || 0) - 1);
      var c = s.byCat[r.categoryName] = s.byCat[r.categoryName] || { n: 0, first: 0 };
      c.n++; if (r.firstTry) c.first++;
      (r.terms || []).forEach(function (t) { if (s.terms.indexOf(t) < 0) s.terms.push(t); });
    });
    return s;
  }
  function recordLabel(r) {
    if (r.firstTry) return '1回目で正解';
    if (r.solved) return (r.wrong ? '再挑戦して正解' : 'ヒントを見て正解');
    return '解説で確認';
  }

  TS.QuestionView = QuestionView;
  TS.QuizRunner = QuizRunner;
  TS.quiz = { summarize: summarize, recordLabel: recordLabel, KANA: KANA };
})(window);
