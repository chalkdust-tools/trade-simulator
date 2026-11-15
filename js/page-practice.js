/*
 * page-practice.js — 演習問題（設定 → 画面で解く／A4プリント）
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui, h = ui.h, P = TS.problems, Q = TS.quiz;

  var COUNTS = [3, 5, 10, 20];

  function radioGroup(name, legend, items, value, onPick) {
    var fs = h('fieldset', { class: 'radio-group' }, h('legend', null, legend));
    items.forEach(function (it) {
      var id = name + '-' + it.value;
      var inp = h('input', { type: 'radio', name: name, id: id, value: String(it.value), checked: String(it.value) === String(value), disabled: !!it.disabled,
        on: { change: function () { if (inp.checked) onPick(it.value); } } });
      fs.appendChild(h('label', { class: 'radio-card' + (it.disabled ? ' disabled' : ''), for: id }, inp,
        h('span', null, h('strong', null, it.label), it.sub ? h('small', null, it.sub) : null)));
    });
    return fs;
  }

  /** 問題プリント（A4） */
  function problemSheet(problems, s) {
    return h('div', { class: 'sheet' },
      h('header', { class: 'sheet-head' },
        h('p', { class: 'sheet-kicker' }, '公共／政治・経済　比較生産費説'),
        h('h1', null, '演習プリント（問題）'),
        h('p', { class: 'sheet-meta' }, P.DIFFICULTIES[s.difficulty] + '・' + problems.length + '問　問題番号 ' + s.seed + '　' + ui.todayStr()),
        h('p', { class: 'sheet-name' }, '　　年　　組　　番　名前＿＿＿＿＿＿＿＿＿＿＿＿＿＿')),
      h('p', { class: 'sheet-note' }, '表の数字は、それぞれが時間（労働量）をすべてその商品に使ったときに作れる量（個）です。数字は架空のものです。'),
      problems.map(function (p, k) {
        return h('section', { class: 'sheet-q' },
          h('h2', null, '問' + (k + 1) + '　', h('span', { class: 'sheet-cat' }, '［' + p.categoryName + '］')),
          ui.dataTable(p.scenario, { small: true }),
          h('p', null, p.prompt),
          p.format === 'choice'
            ? h('p', { class: 'sheet-choices' }, p.choices.map(function (c, i) { return h('span', null, Q.KANA[i] + '．' + c); }))
            : h('p', { class: 'sheet-answer' }, '答え（　　　　　　　）' + (p.unit || '')));
      }),
      h('p', { class: 'sheet-foot' }, '解答・解説は別紙'));
  }

  /** 解答・解説（別紙） */
  function answerSheet(problems, s) {
    return h('div', { class: 'sheet' },
      h('header', { class: 'sheet-head' },
        h('p', { class: 'sheet-kicker' }, '公共／政治・経済　比較生産費説'),
        h('h1', null, '演習プリント（解答・解説）'),
        h('p', { class: 'sheet-meta' }, P.DIFFICULTIES[s.difficulty] + '・' + problems.length + '問　問題番号 ' + s.seed + '　' + ui.todayStr())),
      problems.map(function (p, k) {
        var ans = p.format === 'choice' ? Q.KANA[p.answerIndex] + '．' + p.choices[p.answerIndex] : p.answer.toDisplay() + (p.unit || '');
        return h('section', { class: 'sheet-q' },
          h('h2', null, '問' + (k + 1) + '　', h('span', { class: 'sheet-cat' }, '［' + p.categoryName + '］'), '　答え：', h('strong', null, ans)),
          h('ol', { class: 'steps' }, p.steps.map(function (st) { return h('li', null, st); })),
          h('p', null, p.explanation));
      }));
  }

  function render(app, params) {
    var settings = {
      difficulty: params.d === 'intro' ? 'intro' : 'standard',
      count: COUNTS.indexOf(Number(params.n)) >= 0 ? Number(params.n) : 5,
      categories: Object.keys(P.CATEGORIES),
      seed: /^\d{1,9}$/.test(params.seed || '') ? Number(params.seed) : P.newSeed(),
      source: 'random'
    };
    var sc = ui.getScenario();
    var fixedOk = P.fixedScenarioUsable(sc);

    var head = ui.pageHead('演習問題', [{ text: '演習問題' }], '比較優位・機会費用・分業の問題に挑戦します。まちがえてもヒントが出るので、あわてずに。下で選んで「画面で解く」を押してください。');
    var body = h('div');
    ui.append(app, [head, body]);

    function buildSet() {
      var o = { difficulty: settings.difficulty, count: settings.count, categories: settings.categories, seed: settings.seed };
      if (settings.source === 'scenario' && fixedOk) o.fixed = { producers: sc.producers, goods: sc.goods, table: sc.table };
      return P.generateSet(o);
    }

    function start() {
      var set = buildSet();
      if (!set.problems.length) { ui.toast('この条件では問題を作れませんでした。出題範囲を広げてください。'); return; }
      var state = { settings: JSON.parse(JSON.stringify(settings)), specs: set.specs, index: 0, records: [], startedAt: Date.now() };
      ui.store.set('quiz', state);
      solve(state);
    }

    function solve(state) {
      ui.clear(body);
      var s = state.settings;
      body.appendChild(h('p', { class: 'muted small no-print' }, P.DIFFICULTIES[s.difficulty] + '・問題番号 ' + s.seed + '　（途中でやめても、この端末なら続きから再開できます）'));
      var box = h('div');
      body.appendChild(box);
      new TS.QuizRunner(box, {
        state: state,
        onSave: function (st) { ui.store.set('quiz', st); },
        onFinish: function (st) {
          var probs = st.specs.map(function (sp) { return P.buildProblem(sp); });
          ui.store.set('results', {
            mode: '演習問題', title: '演習問題（' + P.DIFFICULTIES[s.difficulty] + '）', date: ui.todayStr(), seed: s.seed,
            difficulty: s.difficulty, records: st.records,
            problems: probs.map(function (p) { return p ? p.prompt : ''; }),
            retry: '#/practice?d=' + s.difficulty + '&n=' + s.count + '&seed=' + s.seed
          });
          ui.store.remove('quiz');
          location.hash = '#/results';
        }
      });
      body.appendChild(h('div', { class: 'next-row no-print' },
        h('button', { type: 'button', class: 'btn btn-ghost', on: { click: function () { if (root.confirm('この問題セットをやめて、設定画面にもどりますか？（進み具合は消えます）')) { ui.store.remove('quiz'); setup(); } } } }, 'やめて設定にもどる')));
    }

    function setup() {
      ui.clear(body);
      var resume = ui.store.get('quiz', null);
      if (resume && resume.specs && resume.index < resume.specs.length) {
        body.appendChild(h('div', { class: 'resume' },
          h('p', null, '解きかけの問題セットがあります（' + (resume.index + 1) + '問目から）。'),
          h('div', { class: 'inline' },
            h('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { solve(resume); } } }, '続きから解く'),
            h('button', { type: 'button', class: 'btn btn-ghost', on: { click: function () { ui.store.remove('quiz'); setup(); } } }, '破棄する'))));
      }
      var seedInp = h('input', { type: 'text', inputmode: 'numeric', class: 'input seed-input', id: 'seed', value: String(settings.seed), maxlength: '9',
        on: { input: function () { var v = TS.model.toHalfWidth(seedInp.value).replace(/\D/g, '').slice(0, 9); if (v) { settings.seed = Number(v); refreshLink(); } } } });
      var linkInp = h('input', { type: 'text', class: 'input', readonly: true, 'aria-label': 'この問題セットのリンク' });
      var linkBox = h('div', { class: 'field' });
      function refreshLink() {
        ui.clear(linkBox);
        if (settings.source === 'random') {
          var cats = settings.categories.length === Object.keys(P.CATEGORIES).length ? '' : '&c=' + settings.categories.join('.');
          linkInp.value = location.href.split('#')[0] + '#/practice?d=' + settings.difficulty + '&n=' + settings.count + '&seed=' + settings.seed + cats + '&start=1';
          ui.append(linkBox, [h('label', null, 'この問題のリンク（コピーしてClassroomなどに貼ると、生徒も同じ問題を解けます）'),
            h('div', { class: 'inline' }, linkInp, h('button', { type: 'button', class: 'btn btn-outline btn-sm', on: { click: function () { ui.copyText(linkInp.value); } } }, ui.icon('copy'), 'コピー'))]);
        } else {
          linkBox.appendChild(h('p', { class: 'muted small' }, 'トップで作った例題の表を使う問題は、今はリンクで配れません（今後追加予定）。プリントで配ってください。'));
        }
      }

      var catBox = h('fieldset', { class: 'check-group' }, h('legend', null, '出題範囲'));
      Object.keys(P.CATEGORIES).forEach(function (c) {
        var id = 'cat-' + c;
        var cb = h('input', { type: 'checkbox', id: id, checked: settings.categories.indexOf(c) >= 0,
          on: { change: function () {
            settings.categories = Object.keys(P.CATEGORIES).filter(function (k) { return document.getElementById('cat-' + k).checked; });
            if (!settings.categories.length) { cb.checked = true; settings.categories = [c]; ui.toast('少なくとも1つ選んでください'); }
            refreshLink();
          } } });
        catBox.appendChild(h('label', { class: 'check', for: id }, cb, h('span', null, P.CATEGORIES[c].name)));
      });

      var panel = h('div', { class: 'panel setup' },
        radioGroup('diff', '難易度', [
          { value: 'intro', label: '入門', sub: '選択式中心・計算少なめ' },
          { value: 'standard', label: '標準', sub: '機会費用・合計の計算あり' },
          { value: 'adv', label: '発展', sub: '交換比率など（今後追加予定）', disabled: true }
        ], settings.difficulty, function (v) { settings.difficulty = v; refreshLink(); }),
        radioGroup('count', '問題数', COUNTS.map(function (n) { return { value: n, label: n + '問', sub: '約' + Math.round(n * 1.8) + '分' }; }),
          settings.count, function (v) { settings.count = Number(v); refreshLink(); }),
        catBox,
        radioGroup('src', '表の数字', [
          { value: 'random', label: '問題ごとにちがう数字', sub: '答えはアプリが自動で確かめています' },
          { value: 'scenario', label: 'トップで作った例題の表を使う', sub: fixedOk ? '「' + (sc.title || '現在の例題') + '」' : '国・商品が2つずつの例題のときだけ使えます', disabled: !fixedOk }
        ], settings.source, function (v) { settings.source = v; refreshLink(); }),
        h('div', { class: 'field' }, h('label', { for: 'seed' }, '問題番号（ふつうはこのままでOK。同じ番号なら同じ問題になります）'),
          h('div', { class: 'inline' }, seedInp, h('button', { type: 'button', class: 'btn btn-outline btn-sm', on: { click: function () { settings.seed = P.newSeed(); seedInp.value = String(settings.seed); refreshLink(); } } }, '新しい番号'))),
        h('div', { class: 'inline wrap actions' },
          h('button', { type: 'button', class: 'btn btn-primary btn-lg', on: { click: start } }, ui.icon('play'), '画面で解く'),
          h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { var st = buildSet(); ui.printSheet(problemSheet(st.problems, settings)); } } }, ui.icon('print'), '問題プリントを印刷'),
          h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { var st = buildSet(); ui.printSheet(answerSheet(st.problems, settings)); } } }, ui.icon('print'), '解答・解説を印刷')),
        h('p', { class: 'muted small' }, 'プリントは、「画面で解く」と同じ問題です。問題と解答は別々の紙になります。印刷画面で送り先を「PDFに保存」にすると、PDFファイルとして保存できます。'),
        linkBox);
      body.appendChild(panel);
      refreshLink();
    }

    if (params.c) {
      var cs = String(params.c).split('.').filter(function (c) { return P.CATEGORIES[c]; });
      if (cs.length) settings.categories = cs;
    }
    if (params.start === '1') {
      var cur = ui.store.get('quiz', null);
      // 同じ課題リンクを開き直した場合は続きから
      if (cur && cur.settings && cur.settings.seed === settings.seed && cur.settings.difficulty === settings.difficulty && cur.index < cur.specs.length) solve(cur);
      else start();
    } else setup();
    return { title: '演習問題' };
  }

  TS.pages = TS.pages || {};
  TS.pages.practice = render;
  TS.sheets = { problemSheet: problemSheet, answerSheet: answerSheet };
})(window);
