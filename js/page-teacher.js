/*
 * page-teacher.js — 先生用：課題・プリントをつくる
 *  難易度を選んで、ボタンを1回押すだけで
 *   ・自習課題 → リンクを自動でコピー
 *   ・演習プリント → 問題／解答の印刷ボタンと、同じ問題を画面で解くリンク
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui, h = ui.h, P = TS.problems;

  var LEVEL = {
    intro: { name: '入門', sub: '計算は少なめ。選んで答える問題が中心' },
    standard: { name: '標準', sub: '機会費用などの計算あり' }
  };

  function absUrl(hash) { return location.href.split('#')[0] + hash; }

  /** 自動コピー＋手で選べるリンク欄 */
  function linkBox(url, label) {
    var inp = h('input', { type: 'text', class: 'input link-input', readonly: true, value: url, 'aria-label': label,
      on: { focus: function () { inp.select(); } } });
    return h('div', { class: 'link-row' }, inp,
      h('button', { type: 'button', class: 'btn btn-outline btn-sm', on: { click: function () { ui.copyText(url); } } }, ui.icon('copy'), 'もう一度コピー'));
  }

  function render(app, params) {
    var level = params.d === 'intro' ? 'intro' : 'standard';
    var result = h('div', { class: 'teacher-result', 'aria-live': 'polite' });

    /* ① 難易度 */
    var levelBox = h('div', { class: 'level-pick', role: 'radiogroup', 'aria-label': '難易度' });
    function drawLevels() {
      ui.clear(levelBox);
      Object.keys(LEVEL).forEach(function (k) {
        levelBox.appendChild(h('button', {
          type: 'button', role: 'radio', 'aria-checked': k === level ? 'true' : 'false', class: 'level-btn' + (k === level ? ' on' : ''),
          on: { click: function () { level = k; drawLevels(); ui.clear(result); } }
        }, h('strong', null, LEVEL[k].name), h('span', null, LEVEL[k].sub)));
      });
    }
    drawLevels();

    /* ② 自習課題 */
    function makeStudy(len) {
      var hash = '#/study?course=' + level + '&len=' + len;
      var url = absUrl(hash);
      ui.copyText(url);
      var title = '自習課題（' + LEVEL[level].name + 'コース・約' + len + '分）';
      ui.clear(result);
      ui.append(result, h('div', { class: 'result-card' },
        h('p', { class: 'result-head' }, ui.icon('check', 'ok-icon'), h('strong', null, title + 'のリンクをコピーしました。')),
        h('p', null, 'Classroomなどの投稿欄をクリックして、', h('strong', null, 'Ctrl＋V（Macは⌘＋V）'), 'で貼り付けて配ってください。生徒はリンクを開くだけで始められます。'),
        linkBox(url, title + 'のリンク'),
        h('div', { class: 'inline wrap' },
          h('a', { class: 'btn btn-outline btn-sm', href: hash, target: '_blank', rel: 'noopener' }, '開いて確かめる（新しいタブ）'),
          len === 30
            ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', on: { click: function () { makeStudy(15); } } }, '短い版（約15分）にする')
            : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', on: { click: function () { makeStudy(30); } } }, '30分版にもどす')),
        h('p', { class: 'muted small' }, '中身：予想 → 表の読み取り → 機会費用 → 比較優位 → 時間の配分の実験 → 演習' + (len === 15 ? '3' : (level === 'intro' ? '6' : '8')) + '問 → まとめ。最後に学習結果が出るので、PDFで提出させられます。')));
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ② 演習プリント */
    function makeSheet(count, seed) {
      seed = seed || P.newSeed();
      var set = P.generateSet({ difficulty: level, count: count, seed: seed });
      var s = { difficulty: level, count: count, seed: seed };
      var hash = '#/practice?d=' + level + '&n=' + count + '&seed=' + seed + '&start=1';
      var title = '演習プリント（' + LEVEL[level].name + '・' + set.problems.length + '問）';
      ui.clear(result);
      ui.append(result, h('div', { class: 'result-card' },
        h('p', { class: 'result-head' }, ui.icon('check', 'ok-icon'), h('strong', null, title + 'を作りました。'), h('span', { class: 'muted small' }, '　問題番号 ' + seed)),
        h('div', { class: 'inline wrap big-actions' },
          h('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { ui.printSheet(TS.sheets.problemSheet(set.problems, s)); } } }, ui.icon('print'), '問題プリントを印刷'),
          h('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { ui.printSheet(TS.sheets.answerSheet(set.problems, s)); } } }, ui.icon('print'), '解答・解説を印刷')),
        h('p', { class: 'small' }, 'PDFにするときは、印刷画面の送り先を「PDFに保存」にします。'),
        h('div', { class: 'sub-block' },
          h('p', null, h('strong', null, '同じ問題を、画面で解く課題にもできます：'),
            h('button', { type: 'button', class: 'btn btn-outline btn-sm', on: { click: function () { ui.copyText(absUrl(hash)); } } }, ui.icon('copy'), 'リンクをコピー')),
          h('p', { class: 'muted small' }, '画面で解くと、ヒント・解説・にた問題つきで進められ、最後に学習結果が出ます。')),
        h('div', { class: 'inline wrap' },
          h('span', { class: 'small' }, '問題数：'),
          [5, 10, 20].map(function (n) {
            return h('button', { type: 'button', class: 'btn btn-sm ' + (n === count ? 'btn-outline on' : 'btn-ghost'), 'aria-pressed': n === count ? 'true' : 'false',
              on: { click: function () { makeSheet(n, seed); } } }, n + '問');
          }),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', on: { click: function () { makeSheet(count); } } }, ui.icon('reset'), '別の問題に作り直す')),
        h('details', { class: 'why' }, h('summary', null, '問題の一覧を見る'),
          h('ol', { class: 'steps' }, set.problems.map(function (p) { return h('li', null, '［' + p.categoryName + '］' + p.prompt); })))));
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function bigCard(cls, iconName, title, text, onClick) {
      return h('button', { type: 'button', class: 'mode-card make-card ' + cls, on: { click: onClick } },
        h('span', { class: 'mode-icon' }, ui.icon(iconName)),
        h('span', { class: 'mode-body' }, h('span', { class: 'mode-title' }, title), h('span', { class: 'mode-text' }, text)),
        ui.icon('chevron', 'mode-chev'));
    }

    ui.append(app, [
      ui.pageHead('課題・プリントをつくる', [{ text: '課題・プリントをつくる' }], '難易度を選んで、ボタンを押すだけで作れます。'),
      h('section', { class: 'sec' }, h('h2', { class: 'sec-title' }, '① 難易度を選ぶ'), levelBox),
      h('section', { class: 'sec' }, h('h2', { class: 'sec-title' }, '② つくるものを押す'),
        h('div', { class: 'mode-grid two' },
          bigCard('purple', 'openbook', '自習課題をつくる', '約30分・ヒントつきで一人で進める。押すとリンクがコピーされます。', function () { makeStudy(30); }),
          bigCard('green', 'checklist', '演習プリントをつくる', '10問・A4。問題と解答は別の紙。同じ問題を画面で解くリンクも。', function () { makeSheet(10); })),
        result),
      h('section', { class: 'sec' }, h('h2', { class: 'sec-title' }, 'そのほか'),
        h('div', { class: 'panel other-list' },
          h('ul', { class: 'plain' },
            h('li', null, h('a', { href: '#/sim?intro=1' }, '授業導入5分（先生が画面で見せる）'), '　予想 → 時間の配分を動かす → 結果を比べる、の流れを1画面で。'),
            h('li', null, h('a', { href: '#/practice' }, '細かく決めて作る'), '　出題範囲や問題番号を選んだり、トップで作った例題の表で問題を作ったりできます。'),
            h('li', null, h('a', { href: '#/howto?for=teacher' }, '先生向けマニュアル'), '　配り方・提出の受け取り方など（印刷できます）。'),
            h('li', null, h('a', { href: '#/howto?for=student' }, '生徒向けてびき'), '　生徒に配る説明（印刷できます）。'))),
        h('p', { class: 'muted small' }, 'アカウントやパスワードはありません。生徒の解答が先生に自動で送られることもありません。提出は、生徒が学習結果をPDFにしてClassroomなどに出す形です。'))
    ]);
    return { title: '課題・プリントをつくる' };
  }

  TS.pages = TS.pages || {};
  TS.pages.teacher = render;
})(window);
