/*
 * page-study.js — 自習モード（一本道）
 *  入門（計算少なめ）／標準（機会費用の計算あり）× 短縮15分／標準30分
 *  例題は授業プリントの固定例題（Aさん10・5、Bさん6・4）。自習では数値を変えさせない。
 */
(function (root) {
  'use strict';
  var TS = root.TS, M = TS.model, ui = TS.ui, h = ui.h, P = TS.problems, Q = TS.quiz, Frac = TS.Frac;

  var COURSE = { intro: '入門コース', standard: '標準コース' };
  var DRILL_SEED = { intro: 1101, standard: 2202 };

  function drillCount(st) { return st.len === 15 ? 3 : (st.course === 'intro' ? 6 : 8); }

  /*
   * 各ステップの目安（分）。合計が選択画面の「約15分」「約30分」とぴったり合うようにしてある。
   * ※実際に生徒が使ってかかった時間で検証したものではなく、目安。
   */
  var MINUTES = {
    s15: [1, 1, 2, 2, 1, 3, 3, 2],          // 演習3問 → 合計15分
    intro30: [2, 3, 3, 4, 3, 5, 6, 4],      // 演習6問 → 合計30分
    standard30: [2, 2, 3, 5, 3, 4, 8, 3]    // 演習8問（機会費用は計算あり）→ 合計30分
  };
  function stepsFor(st) {
    var m = st.len === 15 ? MINUTES.s15 : MINUTES[st.course + '30'];
    var defs = [['intro', '今日のゴール'], ['predict', '予想する'], ['abs', '表を読む（絶対優位）'], ['oc', '機会費用を考える'],
      ['comp', '比較優位を決める'], ['exp', '配分を動かして確かめる'], ['drill', '演習問題'], ['wrap', 'まとめ']];
    return defs.map(function (d, k) { return { id: d[0], title: d[1], min: m[k] }; });
  }

  var SC = M.defaultScenario();

  /* ---------- 自習用の確認問題（固定） ---------- */
  function check(key, o) {
    return {
      uid: 'study-' + key, templateId: 'study-' + key, category: 'S', categoryName: '確認',
      format: o.format || 'choice', choices: o.choices, answerIndex: o.answerIndex, answer: o.answer, unit: o.unit,
      prompt: o.prompt, hints: o.hints, steps: o.steps, explanation: o.explanation, reason: o.reason, terms: o.terms || []
    };
  }
  var CHECKS = {
    abs: check('abs', {
      prompt: '商品Aを、同じ時間でより多く作れるのはどちらですか。',
      choices: ['Aさん', 'Bさん', 'どちらも同じ'], answerIndex: 0,
      hints: ['表の「商品A」の列（たて）だけを見よう。', 'Aさんは10個、Bさんは6個です。', '多い方が、商品Aの「絶対優位」を持っています。'],
      steps: ['商品Aの列：Aさん 10個、Bさん 6個', '10 ＞ 6 なので Aさん'],
      explanation: 'Aさんは10個、Bさんは6個なので、Aさんの方が多く作れます。', reason: '10個 ＞ 6個 です。', terms: ['絶対優位']
    }),
    ocIntro: check('oc', {
      prompt: 'Bさんが商品Aを1個つくると、商品Bを何個あきらめることになりますか。',
      choices: ['2/3個（約0.67個）', '3/2個（1.5個）', '4個', '6個'], answerIndex: 0,
      hints: ['Bさんの行だけを見よう。Bさんは1日で商品A 6個、または商品B 4個つくれます。', '商品A 6個 ⇔ 商品B 4個。これを商品A 1個あたりにします。', '4 ÷ 6 を計算しよう。'],
      steps: ['商品A 6個 ⇔ 商品B 4個（同じ1日）', '商品A 1個あたり：4 ÷ 6 ＝ 2/3個（約0.67個）'],
      explanation: 'Bさんは1日で商品Aを6個、または商品Bを4個つくれます。商品Aを1個つくると、商品Bを 4÷6＝2/3個（約0.67個）あきらめます。',
      reason: '4÷6＝2/3個です。', terms: ['機会費用']
    }),
    ocStd: check('oc', {
      format: 'number', answer: new Frac(2, 3), unit: '個',
      prompt: 'Bさんが商品Aを1個つくると、商品Bを何個あきらめることになりますか。分数（例：1/2）か、小数第2位まで（例：0.5）で答えよう。',
      hints: ['Bさんの行だけを見よう。Bさんは1日で商品A 6個、または商品B 4個つくれます。', '商品A 6個 ⇔ 商品B 4個。商品A 1個あたりにするには、6で割ります。', '4 ÷ 6 を計算しよう（約分すると？）。'],
      steps: ['商品A 6個 ⇔ 商品B 4個（同じ1日）', '商品A 1個あたり：4 ÷ 6 ＝ 2/3（約0.67）個'],
      explanation: 'Bさんは1日で商品Aを6個、または商品Bを4個つくれます。商品Aを1個つくると、商品Bを 4÷6＝2/3（約0.67）個 あきらめます。',
      reason: '4÷6＝2/3（約0.67）個です。', terms: ['機会費用']
    }),
    comp: check('comp', {
      prompt: '商品Aを1個つくるとき、あきらめる商品Bが少ないのはどちらですか。',
      choices: ['Aさん（0.5個）', 'Bさん（約0.67個）', 'どちらも同じ'], answerIndex: 0,
      hints: ['機会費用は、Aさん 1/2個（0.5個）、Bさん 2/3個（約0.67個）でした。', '0.5 と 0.67、どちらが小さい？', 'あきらめる量が少ない方が「比較優位」を持ちます。'],
      steps: ['Aさん：5÷10＝0.5個', 'Bさん：4÷6＝約0.67個', '0.5 ＜ 0.67 なので Aさんの方が少ない'],
      explanation: 'Aさんは0.5個、Bさんは約0.67個なので、Aさんの方があきらめる量が少なくてすみます。だから商品Aの比較優位はAさんにあります。',
      reason: '0.5個 ＜ 約0.67個 です。', terms: ['比較優位']
    })
  };
  var TERM_QS = [
    check('t1', {
      prompt: '国どうしで、得意なものを分担して生産することを何といいますか。',
      choices: ['国際分業', '自由貿易', '機会費用', '絶対優位'], answerIndex: 0,
      hints: ['「分担して生産」がキーワード。', '「〜分業」という言葉です。', '国と国のあいだの分業です。'],
      steps: ['分担して生産 → 分業', '国どうし → 国際分業'], explanation: '国どうしで得意な生産物を分担することを「国際分業」といいます。', reason: '国どうしの分業＝国際分業です。', terms: ['国際分業']
    }),
    check('t2', {
      prompt: '「他のものと比べて、相対的に得意なもの」に集中する考え方を何といいますか。',
      choices: ['絶対優位', '比較優位', '自由貿易', '国際分業'], answerIndex: 1,
      hints: ['「相手より多く作れる」ことではありません。', '「比べて」がヒント。', '機会費用が小さいものに集中する考え方です。'],
      steps: ['相手より多く作れる → 絶対優位', '相対的に得意（機会費用が小さい） → 比較優位'], explanation: '「相対的に得意なもの」に集中する考え方は「比較優位」です。相手より多く作れること（絶対優位）とは区別します。', reason: '相対的に得意＝比較優位です。', terms: ['比較優位']
    }),
    check('t3', {
      prompt: 'ある商品を1個つくるときに、あきらめる別の商品の量を何といいますか。',
      choices: ['生産量', '機会費用', '交易条件', '絶対優位'], answerIndex: 1,
      hints: ['今日、割り算で計算した量です。', '「〜費用」という言葉です。', '「機会」をあきらめる費用です。'],
      steps: ['商品Aを1個 → 商品Bを0.5個あきらめる（Aさん）', 'このあきらめる量 → 機会費用'], explanation: '1個つくるときにあきらめる別の商品の量を「機会費用」といいます。', reason: 'あきらめる量＝機会費用です。', terms: ['機会費用']
    })
  ];

  var TERMS = [
    ['絶対優位', '同じ時間（同じ労働量）で、相手より多く作れること。'],
    ['機会費用', 'ある商品を1個つくるときに、あきらめる別の商品の量。'],
    ['比較優位', '機会費用が相手より小さいこと（相対的に得意）。両方で絶対優位でも、比較優位は片方だけ。'],
    ['国際分業', '国どうしで得意な（比較優位のある）ものを分担して生産すること。']
  ];

  /* ---------- 小さな部品 ---------- */
  function unitRow(n, cls, label) {
    var row = h('div', { class: 'units' }, h('span', { class: 'units-label' }, label));
    var box = h('span', { class: 'unit-boxes', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) box.appendChild(h('span', { class: 'u ' + cls }));
    row.appendChild(box);
    row.appendChild(h('span', { class: 'units-num' }, n + '個'));
    return row;
  }
  function termCard(term, def) { return h('div', { class: 'term-card' }, h('strong', null, term), h('span', null, def)); }
  function card(cls, children) { return h('div', { class: 'study-card ' + (cls || '') }, children); }

  /** 解答済みの確認問題を、もう一度解かせずに表示 */
  function answeredBox(prob, rec) {
    var ans = prob.format === 'choice' ? prob.choices[prob.answerIndex] : prob.answer.toDisplay() + (prob.unit || '');
    return card('done', [h('p', null, h('strong', null, '解答ずみ：'), Q.recordLabel(rec) + '　答え：' + ans), h('p', { class: 'small' }, prob.explanation)]);
  }

  /* ---------- 画面 ---------- */
  function render(app, params) {
    var st = ui.store.get('study', null);
    // 壊れた保存データは使わない
    if (st && (typeof st !== 'object' || !COURSE[st.course] || [15, 30].indexOf(st.len) < 0 || !(st.step >= 0 && st.step < 8) || typeof st.checks !== 'object' || !st.checks || typeof st.exp !== 'object' || !st.exp)) { st = null; ui.store.remove('study'); }
    var main = h('div', { class: 'study' });
    ui.append(app, [ui.pageHead('自習モード', [{ text: '自習モード' }]), main]);

    function save() { ui.store.set('study', st); }
    function newState(course, len) {
      return { course: course, len: len, step: 0, predictions: {}, checks: {}, quiz: null, reflection: '', selfCheck: {}, exp: {}, startedAt: Date.now() };
    }

    /* コース選択 */
    function chooseCourse() {
      ui.clear(main);
      var len = params.len === '15' ? 15 : 30;
      var lenGroup = h('fieldset', { class: 'radio-group' }, h('legend', null, '時間'),
        [[15, '短縮版（約15分）', '演習3問'], [30, '標準版（約30分）', '演習6〜8問']].map(function (o) {
          var inp = h('input', { type: 'radio', name: 'len', id: 'len' + o[0], value: String(o[0]), checked: o[0] === len, on: { change: function () { len = o[0]; } } });
          return h('label', { class: 'radio-card', for: 'len' + o[0] }, inp, h('span', null, h('strong', null, o[1]), h('small', null, o[2])));
        }));
      function courseCard(course, title, text, cls) {
        return h('button', { type: 'button', class: 'mode-card ' + cls, on: { click: function () { st = newState(course, len); save(); show(); } } },
          h('span', { class: 'mode-icon' }, ui.icon(course === 'intro' ? 'openbook' : 'calc')),
          h('span', { class: 'mode-body' }, h('span', { class: 'mode-title' }, title), h('span', { class: 'mode-text' }, text)),
          ui.icon('chevron', 'mode-chev'));
      }
      ui.append(main, [
        h('p', { class: 'lead' }, 'ヒントと解説を見ながら、自分のペースで進めます。画面の「次へ」を押していけば大丈夫です。'),
        h('div', { class: 'panel' }, lenGroup,
          h('div', { class: 'mode-grid two' },
            courseCard('intro', '入門コース', '計算は少なめ。選んで答える問題が中心です。', 'purple'),
            courseCard('standard', '標準コース', '機会費用を自分で計算します。', 'blue'))),
        h('p', { class: 'muted small' }, '進み具合は、このパソコン（タブレット）に自動で保存されます。途中でやめても、同じ端末なら続きから始められます（別の端末には引き継がれません）。')
      ]);
    }

    /* 再開確認 */
    function askResume() {
      ui.clear(main);
      var steps = stepsFor(st);
      ui.append(main, [h('div', { class: 'panel resume' },
        h('p', null, COURSE[st.course] + '（約' + st.len + '分）の途中です：ステップ ' + (st.step + 1) + '「' + steps[st.step].title + '」'),
        h('div', { class: 'inline wrap' },
          h('button', { type: 'button', class: 'btn btn-primary btn-lg', on: { click: show } }, '続きから'),
          h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { if (root.confirm('最初からやり直しますか？ 今の進み具合は消えます。')) { ui.store.remove('study'); st = null; chooseCourse(); } } } }, '最初からやり直す')))]);
    }

    /* 別の自習課題のリンクが開かれたとき：新しい課題か、前の続きかを選んでもらう（記録は勝手に消さない） */
    function askWhichTask(course, len) {
      ui.clear(main);
      var steps = stepsFor(st);
      ui.append(main, [h('div', { class: 'panel resume other-task' },
        h('p', null, h('strong', null, '先生から、別の自習課題のリンクが開かれました。')),
        h('p', null, 'この端末には、前の自習（' + COURSE[st.course] + '・約' + st.len + '分／ステップ ' + (st.step + 1) + '「' + steps[st.step].title + '」）の途中の記録があります。どちらを始めますか？'),
        h('div', { class: 'inline wrap' },
          h('button', { type: 'button', class: 'btn btn-primary btn-lg', on: { click: function () { st = newState(course, len); save(); show(); } } },
            '新しい課題を始める（' + COURSE[course] + '・約' + len + '分）'),
          h('button', { type: 'button', class: 'btn btn-outline', on: { click: show } },
            '前の続きに戻る（' + COURSE[st.course] + '・約' + st.len + '分）')),
        h('p', { class: 'muted small' }, '「新しい課題を始める」を選ぶと、前の自習の途中の記録は消えます。迷ったら、先生の指示にしたがってください。'))]);
    }

    /* 各ステップ */
    function show() {
      ui.clear(main);
      var steps = stepsFor(st);
      var step = steps[st.step];
      var total = steps.length;
      var remain = steps.slice(st.step).reduce(function (a, s) { return a + s.min; }, 0);
      var nextBtn = h('button', { type: 'button', class: 'btn btn-primary btn-lg', on: { click: function () { go(1); } } }, st.step === total - 1 ? '学習結果を見る' : '次へ', ui.icon('chevron'));
      var backBtn = h('button', { type: 'button', class: 'btn btn-outline', disabled: st.step === 0, on: { click: function () { go(-1); } } }, ui.icon('back'), '戻る');
      var gate = h('p', { class: 'gate muted small', 'aria-live': 'polite' });
      function setReady(ok, msg) { nextBtn.disabled = !ok; gate.textContent = ok ? '' : (msg || ''); }

      var progress = h('div', { class: 'study-progress' },
        h('div', { class: 'study-progress-top' },
          h('span', { class: 'q-num' }, 'ステップ ' + (st.step + 1) + ' / ' + total),
          h('span', { class: 'muted small' }, COURSE[st.course] + '・のこり約' + remain + '分')),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(st.step + 1), 'aria-label': '自習の進み具合' },
          h('span', { style: { width: ((st.step + 1) / total * 100) + '%' } })),
        h('ol', { class: 'step-dots', 'aria-hidden': 'true' }, steps.map(function (s, k) { return h('li', { class: k < st.step ? 'done' : (k === st.step ? 'now' : '') }, s.title); })));
      var body = h('div', { class: 'study-body' });
      var titleEl = h('h2', { class: 'step-title', tabindex: '-1' }, step.title);
      ui.append(main, [progress, titleEl, body]);
      var nav = h('div', { class: 'next-row study-nav' }, backBtn, gate, nextBtn);

      var builders = { intro: sIntro, predict: sPredict, abs: sAbs, oc: sOc, comp: sComp, exp: sExp, drill: sDrill, wrap: sWrap };
      builders[step.id](body, setReady);
      if (step.id !== 'drill') main.appendChild(nav);
      main.scrollIntoView({ block: 'start' });
      titleEl.focus({ preventScroll: true });
    }

    function go(d) {
      var steps = stepsFor(st);
      if (st.step + d >= steps.length) { finish(); return; }
      st.step = Math.max(0, st.step + d);
      save(); show();
    }

    /** 確認問題を出す（解答済みならその結果を表示） */
    function askCheck(container, key, prob, setReady, after) {
      if (st.checks[key]) {
        container.appendChild(answeredBox(prob, st.checks[key]));
        if (after) container.appendChild(after());
        setReady(true);
        return;
      }
      setReady(false, '問題に答えると「次へ」が押せます（ヒント・解説もあります）。');
      var qv = new TS.QuestionView(prob, {
        showTable: false,
        onResolved: function (rec) {
          st.checks[key] = rec; save();
          if (after) container.appendChild(after());
          setReady(true);
        }
      });
      container.appendChild(h('div', { class: 'panel q-panel' }, h('p', { class: 'q-label' }, '確認問題'), qv.el));
    }

    function sIntro(b, setReady) {
      ui.append(b, [
        card('goal', [h('p', { class: 'goal-kicker' }, '今日の問い'), h('p', { class: 'goal-text' }, '両方とも得意な人がいても、2人で分担する意味はあるのだろうか？')]),
        h('p', null, 'AさんとBさんは、1日で「商品A」と「商品B」を作ることができます。1日をまるごと1つの商品に使ったときに作れる数が、下の表です。'),
        ui.dataTable(SC),
        h('p', { class: 'muted small' }, '※数値は学習用の架空のものです。'),
        h('h3', { class: 'mini-title' }, '今日覚えること'),
        h('div', { class: 'term-grid' }, TERMS.map(function (t) { return h('span', { class: 'term-chip' }, t[0]); })),
        card('howto', [h('p', null, h('strong', null, '進め方：'), '画面の問いに答えて「次へ」を押していきます。まちがえてもヒントが出ます。わからないときは「答えと解説を見る」も使えます。')])
      ]);
      setReady(true);
    }

    function sPredict(b, setReady) {
      st.predictions = st.predictions || {};
      function poll(key, question, choices) {
        var fb = h('p', { class: 'small muted', 'aria-live': 'polite' });
        var grp = h('div', { class: 'choices', role: 'group', 'aria-label': question });
        choices.forEach(function (c, k) {
          var btn = h('button', { type: 'button', class: 'choice' + (st.predictions[key] === c ? ' picked' : ''), 'aria-pressed': st.predictions[key] === c ? 'true' : 'false',
            on: { click: function () {
              st.predictions[key] = c; save();
              Array.prototype.forEach.call(grp.children, function (x) { x.classList.remove('picked'); x.setAttribute('aria-pressed', 'false'); });
              btn.classList.add('picked'); btn.setAttribute('aria-pressed', 'true');
              fb.textContent = '予想「' + c + '」を記録しました。答えはこのあと確かめます。';
              refresh();
            } } }, h('span', { class: 'kana' }, Q.KANA[k]), h('span', null, c));
          grp.appendChild(btn);
        });
        if (st.predictions[key]) fb.textContent = '予想「' + st.predictions[key] + '」を記録しています。';
        return h('div', { class: 'panel q-panel' }, h('p', { class: 'q-label' }, '予想'), h('p', { class: 'prompt' }, question), grp, fb);
      }
      function refresh() { setReady(!!(st.predictions.q1 && st.predictions.q2), '2つとも予想を選ぶと「次へ」が押せます。正解・不正解はありません。'); }
      ui.append(b, [
        h('p', null, 'まずは直感で予想してみよう。ここでは正解・不正解はつけません。'),
        ui.dataTable(SC, { small: true }),
        poll('q1', 'Aさんは、商品Aも商品Bも、Bさんより多く作れます。それでも2人で分担する意味はあると思いますか？', ['ある', 'ない', 'わからない']),
        poll('q2', 'もし分担するなら、Aさんはどちらの商品を担当するとよさそうですか？', ['商品A', '商品B', 'わからない'])
      ]);
      refresh();
    }

    function sAbs(b, setReady) {
      b.appendChild(h('p', null, '「同じ時間で、相手より多く作れる」ことを「絶対優位」といいます。表で確かめよう。'));
      b.appendChild(ui.dataTable(SC, { small: true }));
      askCheck(b, 'abs', CHECKS.abs, setReady, function () {
        return h('div', null,
          card('info', [h('p', null, '商品Bも見てみると、Aさん5個、Bさん4個。Aさんは', h('strong', null, '商品Aも商品Bも'), 'Bさんより多く作れます。'),
            h('p', null, 'つまり、Aさんは両方の商品で「絶対優位」を持っています。では、Bさんの出番はないのでしょうか？ 次のステップで考えます。')]),
          termCard(TERMS[0][0], TERMS[0][1]));
      });
    }

    function sOc(b, setReady) {
      var reveal = h('div', { class: 'reveal-steps' });
      var shown = st.exp.ocShown || 0;
      var stepsTxt = [
        'Aさんは1日で、商品Aなら10個、商品Bなら5個つくれます。',
        'つまり「商品A 10個」と「商品B 5個」は、同じ1日分です。',
        '商品Aを1個つくるたびに、商品Bを 5÷10＝0.5個（1/2個）あきらめることになります。'
      ];
      var moreBtn = h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { shown++; st.exp.ocShown = shown; save(); drawReveal(); } } }, 'つづきを見る');
      var checkBox = h('div');
      function drawReveal() {
        ui.clear(reveal);
        stepsTxt.slice(0, shown).forEach(function (t, k) { reveal.appendChild(h('p', { class: 'reveal-line' }, h('span', { class: 'num' }, String(k + 1)), t)); });
        moreBtn.classList.toggle('hidden', shown >= stepsTxt.length);
        if (shown >= stepsTxt.length && !checkBox.firstChild) {
          checkBox.appendChild(h('p', null, 'このように、1個つくるときにあきらめる別の商品の量を「機会費用」といいます。では、Bさんの場合は？'));
          askCheck(checkBox, 'oc', st.course === 'intro' ? CHECKS.ocIntro : CHECKS.ocStd, setReady, function () {
            return h('div', null,
              h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
                h('caption', null, '商品Aを1個つくるときに、あきらめる商品B'),
                h('thead', null, h('tr', null, h('th', null, ''), h('th', { scope: 'col' }, '計算'), h('th', { scope: 'col' }, '機会費用'))),
                h('tbody', null,
                  h('tr', null, h('th', { scope: 'row' }, 'Aさん'), h('td', null, '5÷10'), h('td', { class: 'hl' }, '1/2個（0.5個）')),
                  h('tr', null, h('th', { scope: 'row' }, 'Bさん'), h('td', null, '4÷6'), h('td', null, '2/3個（約0.67個）'))))),
              termCard(TERMS[1][0], TERMS[1][1]));
          });
        } else if (shown < stepsTxt.length) setReady(false, '「つづきを見る」で説明を最後まで読もう。');
      }
      ui.append(b, [
        h('p', null, 'Aさんが商品Aを1個つくると、そのぶん商品Bをつくる時間がへります。何個あきらめることになるでしょう？'),
        h('div', { class: 'units-box', role: 'img', 'aria-label': 'Aさんの1日：商品Aなら10個、または商品Bなら5個' },
          h('p', { class: 'units-title' }, 'Aさんの1日'),
          unitRow(10, 'a', '商品A'), h('p', { class: 'units-or' }, 'または'), unitRow(5, 'b', '商品B')),
        reveal, moreBtn, checkBox
      ]);
      drawReveal();
    }

    function sComp(b, setReady) {
      b.appendChild(h('p', null, '機会費用（あきらめる量）を比べて、商品Aを担当するのに向いているのはどちらか考えよう。'));
      askCheck(b, 'comp', CHECKS.comp, setReady, function () {
        var pred = st.predictions || {};
        var predMsg = pred.q2 === '商品A' ? 'あなたの予想「Aさんは商品A」は当たりです。'
          : (pred.q2 === '商品B' ? 'あなたは「Aさんは商品B」と予想しました。両方多く作れるAさんでも、相対的に得意なのは商品Aでした。'
            : '予想は「わからない」でした。機会費用で比べると、はっきりしましたね。');
        return h('div', null,
          card('info', [
            h('p', null, 'あきらめる量（機会費用）が小さい方が、その商品に', h('strong', null, '「比較優位」'), 'を持ちます。商品Aの比較優位はAさんです。'),
            h('p', null, '商品Bも同じように考えると、商品Bを1個つくるとき、Aさんは商品Aを 10÷5＝2個、Bさんは 6÷4＝1.5個 あきらめます。小さいのはBさん。だから', h('strong', null, '商品Bの比較優位はBさん'), 'です。'),
            h('p', null, 'Aさんは両方多く作れても、比較優位は片方（商品A）だけ。Bさんにも比較優位のある商品（商品B）があります。')]),
          card('pred', [h('p', null, h('strong', null, '予想ふりかえり：'), predMsg)]),
          termCard(TERMS[2][0], TERMS[2][1]));
      });
    }

    function sExp(b, setReady) {
      var base = M.production(SC, [[50, 50], [50, 50]]).total;
      var shares = st.exp.shares || [[50, 50], [50, 50]];
      var status = h('div', { class: 'exp-status', 'aria-live': 'polite' });
      var hintBox = h('ol', { class: 'hint-list' });
      var hints = ['Aさんは商品Aに、Bさんは商品Bに、少しずつ時間を寄せてみよう。', 'Aさんの「商品A」を60%→70%→80%と上げ、Bさんの「商品A」を40%→20%→10%と下げてみよう。', '例：Aさん80%、Bさん10%。'];
      var hintN = st.exp.hints || 0;
      var hintBtn = h('button', { type: 'button', class: 'btn btn-ghost', on: { click: function () { if (hintN < hints.length) { hintN++; st.exp.hints = hintN; save(); drawHints(); } } } }, ui.icon('bulb'), 'ヒントを見る');
      function drawHints() { ui.clear(hintBox); hints.slice(0, hintN).forEach(function (t, k) { hintBox.appendChild(h('li', null, h('strong', null, 'ヒント' + (k + 1) + '：'), t)); }); hintBtn.disabled = hintN >= hints.length; }
      var ranges = [];
      function slider(i) {
        var id = 'exp' + i;
        var out = h('output', { for: id, class: 'pct' });
        var r = h('input', { type: 'range', id: id, class: 'range', min: '0', max: '100', step: '5', value: String(shares[i][0]),
          on: { input: function () { shares[i] = [Number(r.value), 100 - Number(r.value)]; update(); } } });
        ranges.push({ r: r, out: out });
        return h('div', { class: 'alloc-card' }, h('h3', null, SC.producers[i]),
          h('label', { for: id, class: 'share-label' }, '商品Aに使う時間（残りは商品Bに使う）'),
          h('div', { class: 'share-row' }, r, out));
      }
      var resT = h('div');
      function update() {
        ranges.forEach(function (o, i) { o.out.textContent = '商品A ' + shares[i][0] + '% ／ 商品B ' + shares[i][1] + '%'; o.r.value = String(shares[i][0]); });
        var cur = M.production(SC, shares).total, cmp = M.compareTotals(base, cur);
        ui.clear(resT);
        resT.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table result-table' },
          h('thead', null, h('tr', null, h('th', null, '商品'), h('th', null, '50%ずつのとき'), h('th', null, '今'), h('th', null, 'ちがい'))),
          h('tbody', null, SC.goods.map(function (g, j) {
            return h('tr', null, h('th', { scope: 'row' }, g), h('td', null, ui.fmt(base[j]) + '個'), h('td', { class: 'strong' }, ui.fmt(cur[j]) + '個'),
              h('td', { class: cmp[j].sign > 0 ? 'up' : (cmp[j].sign < 0 ? 'down' : '') }, ui.signText(cmp[j].sign, cmp[j].delta)));
          })))));
        var both = cmp[0].sign > 0 && cmp[1].sign > 0;
        var isSpec = shares[0][0] === 100 && shares[1][0] === 0;
        if (both) st.exp.goal = true;
        if (isSpec) st.exp.spec = true;
        st.exp.shares = shares; save();
        ui.clear(status);
        if (isSpec) status.appendChild(card('info', [h('p', null, h('strong', null, '完全分業：'), '商品Aは10個にふえましたが、商品Bは4.5個→4個に', h('strong', null, 'へりました'), '。完全分業がいつも両方の商品をふやすとはかぎりません。')]));
        else if (both) status.appendChild(card('ok', [h('p', null, ui.icon('check', 'ok-icon'), h('strong', null, 'できました！ '), '50%ずつのときより、商品Aも商品Bもふえています。比較優位にそって時間を寄せると、2人の合計を両方ふやせることがあります。')]));
        else status.appendChild(h('p', { class: 'muted' }, '目標：表の「ちがい」の列を、商品Aも商品Bも「＋（ふえた）」にしよう。'));
        drawSummary();
        setReady(true);
      }
      var summary = h('div');
      function drawSummary() {
        ui.clear(summary);
        if (st.exp.goal && st.exp.spec) {
          summary.appendChild(card('point', [h('p', null, h('strong', null, '大事なポイント')),
            h('ul', null,
              h('li', null, '比較優位にそって分担すると、2人の合計を両方ふやせる配分がある。'),
              h('li', null, 'でも「完全に分業すれば、かならず両方ふえる」わけではない（商品Bはへった）。'),
              h('li', null, 'ふえた分を交換（貿易）して、2人とも得をするかどうかは、交換の条件しだい（発展で学びます）。'))]));
        } else if (st.exp.goal) {
          summary.appendChild(h('p', null, 'もう1つ：「完全分業」ボタンを押して、Aさんは商品Aだけ、Bさんは商品Bだけをつくったらどうなるか見てみよう。'));
        }
      }
      ui.append(b, [
        h('p', null, '2人とも時間を50%ずつ使うと、2人の合計は商品A 8個・商品B 4.5個です。つまみを左右に動かして時間の使い方を変え、', h('strong', null, '商品Aも商品Bも、この数より多くできるか'), '試そう。'),
        h('div', { class: 'alloc-grid' }, slider(0), slider(1)),
        h('div', { class: 'inline wrap' },
          h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { shares = [[50, 50], [50, 50]]; update(); } } }, ui.icon('reset'), '50%ずつに戻す'),
          h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { shares = [[100, 0], [0, 100]]; update(); } } }, '完全分業を試す'),
          hintBtn),
        hintBox, resT, status, summary
      ]);
      drawHints();
      update();
    }

    function sDrill(b) {
      var n = drillCount(st);
      if (!st.quiz) {
        var set = P.generateSet({ difficulty: st.course, count: n, seed: DRILL_SEED[st.course] + st.len });
        st.quiz = { specs: set.specs, index: 0, records: [] };
        save();
      }
      b.appendChild(h('p', null, '今日の内容を、ちがう数字の表で練習します。全' + st.quiz.specs.length + '問（「にた問題でもう一度」を選ぶと、そのぶんふえます）。'));
      var box = h('div'); b.appendChild(box);
      new TS.QuizRunner(box, {
        state: st.quiz, finishLabel: 'まとめへ', scrollTop: false,
        onSave: function (q) { st.quiz = q; save(); },
        onFinish: function () { go(1); }
      });
      b.appendChild(h('div', { class: 'next-row study-nav' },
        h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { go(-1); } } }, ui.icon('back'), '戻る'),
        h('span', { class: 'muted small' }, '途中でやめても、この端末なら続きから再開できます。')));
    }

    function sWrap(b, setReady) {
      ui.append(b, [
        h('h3', { class: 'mini-title' }, '今日覚えること'),
        h('div', { class: 'term-list' }, TERMS.map(function (t) { return termCard(t[0], t[1]); }))
      ]);
      var qBox = h('div');
      b.appendChild(h('h3', { class: 'mini-title' }, '確認問題（3問）'));
      b.appendChild(qBox);
      var k = 0;
      function nextQ() {
        var allDone = TERM_QS.every(function (q) { return st.checks[q.uid]; });
        refresh(allDone);
        while (k < TERM_QS.length && st.checks[TERM_QS[k].uid]) { qBox.appendChild(answeredBox(TERM_QS[k], st.checks[TERM_QS[k].uid])); k++; }
        if (k >= TERM_QS.length) return;
        var q = TERM_QS[k];
        var qv = new TS.QuestionView(q, { showTable: false, onResolved: function (rec) { st.checks[q.uid] = rec; save(); k++; nextQ(); } });
        qBox.appendChild(h('div', { class: 'panel q-panel' }, h('p', { class: 'q-label' }, '確認 ' + (k + 1) + ' / 3'), qv.el));
      }
      // 最後の問い（自由記述・自己照合）
      var ta = h('textarea', { class: 'input', id: 'refl', rows: '4', maxlength: '400', placeholder: '例：〇〇とは言えない。なぜなら…', on: { input: function () { st.reflection = ta.value; save(); } } });
      ta.value = st.reflection || '';
      var model = h('div', { class: 'hidden' },
        card('point', [h('p', null, h('strong', null, '模範解答の例：'), '「かならずしも得とはいえない。ほかの国より全部得意でも、機会費用が小さい（比較優位のある）ものに集中して交換すれば、全体の生産をふやせる可能性がある。ただし、交換の条件などによっては得をしない場合もある。」')]),
        h('fieldset', { class: 'check-group' }, h('legend', null, '自分の答えをチェックしよう（自己採点）'),
          [['c1', '「比較優位」または「相対的に得意」にふれている'], ['c2', '「あきらめる量（機会費用）」の考え方にふれている'], ['c3', '「かならず全員が得をする」と言い切っていない']].map(function (c) {
            var cb = h('input', { type: 'checkbox', id: 'sc-' + c[0], checked: !!(st.selfCheck && st.selfCheck[c[0]]), on: { change: function () { st.selfCheck[c[0]] = cb.checked; save(); } } });
            return h('label', { class: 'check', for: 'sc-' + c[0] }, cb, h('span', null, c[1]));
          })));
      var modelBtn = h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { model.classList.remove('hidden'); modelBtn.classList.add('hidden'); } } }, '模範解答と見くらべる');
      ui.append(b, [
        h('h3', { class: 'mini-title' }, '最後の問い（自由に書こう・書かなくても進めます）'),
        h('div', { class: 'panel' },
          h('label', { for: 'refl', class: 'prompt' }, '日本が外国より全部得意だったら、全部自分の国で作った方が得なのだろうか？'),
          ta, h('p', { class: 'muted small' }, 'この欄は自動採点しません。この端末にだけ保存されます。'), modelBtn, model)
      ]);
      function refresh(ok) { setReady(ok, '確認問題3問に答えると、学習結果を見られます。'); }
      nextQ();
    }

    function finish() {
      var checkRecs = Object.keys(st.checks).map(function (k) { return st.checks[k]; });
      var drillRecs = (st.quiz && st.quiz.records) || [];
      ui.store.set('results', {
        mode: '自習モード', title: '自習モード（' + COURSE[st.course] + '・約' + st.len + '分）', date: ui.todayStr(),
        records: drillRecs, checks: checkRecs, predictions: st.predictions, reflection: st.reflection, selfCheck: st.selfCheck,
        experiment: { goal: !!st.exp.goal, spec: !!st.exp.spec },
        minutes: Math.round((Date.now() - (st.startedAt || Date.now())) / 60000),
        retry: '#/study'
      });
      st.finished = true;
      ui.store.remove('study');
      location.hash = '#/results';
    }

    var linkCourse = (params.course === 'intro' || params.course === 'standard') ? params.course : null;
    var linkLen = params.len === '15' ? 15 : 30;
    if (st && !st.finished && stepsFor(st)[st.step]) {
      // リンクのコース・時間が、途中の記録とちがう → 別の課題として扱う
      if (linkCourse && (linkCourse !== st.course || linkLen !== st.len)) askWhichTask(linkCourse, linkLen);
      else if (st.step === 0 && !linkCourse) show();
      else askResume();
    } else if (params.course === 'intro' || params.course === 'standard') {
      st = newState(params.course, params.len === '15' ? 15 : 30); save(); show();
    } else chooseCourse();
    return { title: '自習モード' };
  }

  TS.pages = TS.pages || {};
  TS.pages.study = render;
  TS.studyPlan = { stepsFor: stepsFor, drillCount: drillCount };
})(window);
