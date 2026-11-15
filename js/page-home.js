/*
 * page-home.js — トップページ（参考画像を原型とする）
 */
(function (root) {
  'use strict';
  var TS = root.TS, M = TS.model, ui = TS.ui, h = ui.h, P = TS.problems;

  function modeCard(cls, iconName, title, text, href) {
    return h('a', { class: 'mode-card ' + cls, href: href },
      h('span', { class: 'mode-icon' }, ui.icon(iconName)),
      h('span', { class: 'mode-body' }, h('span', { class: 'mode-title' }, title), h('span', { class: 'mode-text' }, text)),
      ui.icon('chevron', 'mode-chev'));
  }

  function featureCard(cls, iconName, text) {
    return h('div', { class: 'feature ' + cls }, ui.icon(iconName, 'feature-icon'), h('span', null, text));
  }

  function render(app) {
    var sc = ui.getScenario();
    var startBtn;

    /* ---- ヒーロー ---- */
    var hero = h('section', { class: 'hero' },
      h('div', { class: 'hero-text' },
        h('p', { class: 'badge' }, ui.icon('cap', 'badge-icon'), '高校 社会（経済）学習ツール'),
        h('div', { class: 'title-block' },
          h('h1', { class: 'hero-title', tabindex: '-1' }, '比較生産費説シミュレーター'),
          h('p', { class: 'hero-sub' }, '数字を動かして、比較優位・機会費用・分業のしくみを学ぶ')),
        h('p', { class: 'hero-desc' }, '2×2モデルから4×4モデルまで対応。例題を設定して、シミュレーションや演習問題に進めます。'),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn btn-primary btn-xl', href: '#/study' }, ui.icon('play'), 'はじめる'),
          h('button', {
            type: 'button', class: 'btn btn-outline btn-lg',
            on: { click: function () { var t = document.getElementById('example'); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); var f = t.querySelector('select'); if (f) f.focus({ preventScroll: true }); } }
          }, ui.icon('book'), '例題から始める'),
          h('a', { class: 'btn btn-outline btn-lg', href: '#/howto' }, ui.icon('help'), '使い方')),
        h('p', { class: 'hero-note' }, '「はじめる」は、ヒントつきで一人でも進められる自習モード（約15〜30分）です。先生は ', h('a', { href: '#/teacher' }, '課題・プリントをつくる'), ' へ。')),
      ui.heroSVG());

    /* ---- 学習モード ---- */
    var modes = ui.section('学習モードを選ぶ', h('div', { class: 'mode-grid' },
      modeCard('blue', 'laptop', 'シミュレーション', '国や財の数を設定して、分業と生産量の変化を試す', '#/sim'),
      modeCard('green', 'checklist', '演習問題', '比較優位・機会費用・分業の問題に挑戦する', '#/practice'),
      modeCard('purple', 'openbook', '自習モード', 'ヒントと解説を見ながら、自分のペースで学ぶ', '#/study')));

    /* ---- 例題設定 ---- */
    startBtn = h('button', {
      type: 'button', class: 'btn btn-primary',
      on: { click: function () { var s = editor.get(); if (s) { ui.setScenario(s); location.hash = '#/sim'; } } }
    }, ui.icon('play'), 'この設定で始める');
    var startHint = h('p', { class: 'small start-hint', 'aria-live': 'polite' });
    var side = h('div', { class: 'ed-side' },
      startBtn,
      h('button', {
        type: 'button', class: 'btn btn-outline',
        on: { click: function () { editor.load(M.defaultScenario()); metaRefresh(); ui.toast('初期値（AさんとBさん）に戻しました'); } }
      }, ui.icon('reset'), '初期値に戻す'),
      startHint);
    var editor = new TS.ScenarioEditor(sc, {
      layout: 'home', side: side,
      onChange: function (s) { ui.setScenario(s); },
      onValidity: function (ok) { startBtn.disabled = !ok; startHint.textContent = ok ? 'シミュレーションの画面に進みます。' : '表の赤い欄（または下の説明）を直すと押せるようになります。'; }
    });

    // 詳細設定（プリセット・タイトル・保存）
    var titleInp = h('input', { type: 'text', class: 'input', maxlength: '40', id: 'ex-title', on: { input: function () { editor.setMeta({ title: titleInp.value }); } } });
    var descInp = h('textarea', { class: 'input', rows: '2', maxlength: '200', id: 'ex-desc', on: { input: function () { editor.setMeta({ description: descInp.value }); } } });
    function metaRefresh() { var d = editor.draft(); titleInp.value = d.title || ''; descInp.value = d.description || ''; }
    metaRefresh();

    var presetSel = h('select', { class: 'select', id: 'ex-preset' },
      M.PRESETS.map(function (p) { return h('option', { value: p.id }, p.name); }));
    var savedList = h('ul', { class: 'saved-list' });
    function renderSaved() {
      ui.clear(savedList);
      var list = ui.store.get('saved', []);
      if (!list.length) { savedList.appendChild(h('li', { class: 'muted' }, '保存した例題はまだありません。')); return; }
      list.forEach(function (item, k) {
        savedList.appendChild(h('li', null,
          h('span', { class: 'saved-name' }, item.scenario.title || '無題の例題', h('small', null, ' ' + item.scenario.producers.length + '×' + item.scenario.goods.length + '・' + item.savedAt)),
          h('span', { class: 'saved-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-outline', on: { click: function () { editor.load(item.scenario); metaRefresh(); ui.toast('「' + (item.scenario.title || '無題') + '」を読み込みました'); } } }, '読込'),
            h('button', { type: 'button', class: 'btn btn-sm btn-outline', on: { click: function () { var c = M.cloneScenario(item.scenario); c.title = (c.title || '無題') + '（コピー）'; saveScenario(c); } } }, '複製'),
            h('button', {
              type: 'button', class: 'btn btn-sm btn-ghost', on: {
                click: function () {
                  if (!root.confirm('「' + (item.scenario.title || '無題') + '」を削除しますか？')) return;
                  var l = ui.store.get('saved', []); l.splice(k, 1); ui.store.set('saved', l); renderSaved();
                }
              }
            }, '削除'))));
      });
    }
    function saveScenario(s) {
      var list = ui.store.get('saved', []);
      if (list.length >= 30) { ui.toast('保存できるのは30件までです。不要なものを削除してください。'); return; }
      var d = new Date();
      list.unshift({ savedAt: (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'), scenario: s });
      if (!ui.store.set('saved', list)) { ui.toast('保存できませんでした（ブラウザの設定を確認してください）'); return; }
      renderSaved(); ui.toast('この端末に保存しました');
    }
    renderSaved();

    var details = h('details', { class: 'more' },
      h('summary', null, '詳細設定を開く（用意された例題・タイトル・保存）'),
      h('div', { class: 'more-body' },
        h('div', { class: 'more-grid' },
          h('div', { class: 'field' }, h('label', { for: 'ex-preset' }, '用意された例題から選ぶ'),
            h('div', { class: 'inline' }, presetSel,
              h('button', { type: 'button', class: 'btn btn-outline btn-sm', on: { click: function () { var p = M.PRESETS.filter(function (x) { return x.id === presetSel.value; })[0]; editor.load(p.make()); metaRefresh(); ui.toast('「' + p.name + '」を読み込みました'); } } }, '読み込む'))),
          h('div', { class: 'field' }, h('label', { for: 'ex-title' }, '例題タイトル'), titleInp),
          h('div', { class: 'field wide' }, h('label', { for: 'ex-desc' }, '状況説明（生徒に見せる文）'), descInp)),
        h('div', { class: 'inline' },
          h('button', { type: 'button', class: 'btn btn-outline btn-sm', on: { click: function () { var s = editor.get(); if (s) saveScenario(s); else ui.toast('入力にまちがいがあるため保存できません'); } } }, 'この例題を保存'),
          h('span', { class: 'muted small' }, 'このパソコン（タブレット）の中にだけ保存されます。')),
        h('h3', { class: 'mini-title' }, '保存した例題'), savedList,
        h('p', { class: 'muted small' }, '表の数字は「その国（人）が、時間をすべてその商品に使ったときに作れる量」です。「1個つくるのに何時間かかるか」の表や、作った例題をリンク・ファイルで配る機能は、今後追加する予定です。')));

    var example = ui.section('例題設定', h('div', null, h('div', { class: 'panel' }, editor.el), details), { id: 'example' });

    /* ---- できること・授業での使い方 ---- */
    var features = ui.section('このアプリでできること', h('div', { class: 'feature-grid' },
      featureCard('blue', 'scale', '絶対優位と比較優位を見分ける'),
      featureCard('green', 'calc', '機会費用を計算する'),
      featureCard('purple', 'doc', '演習問題を自動で作る')));

    var usage = h('a', { class: 'usage-bar', href: '#/teacher' },
      h('span', { class: 'usage-head' }, ui.icon('teacher', 'usage-icon'), h('strong', null, '授業での使い方')),
      h('span', { class: 'usage-text' }, '導入5分の提示、個人演習、自習課題づくりに使えます。'),
      ui.icon('chevron', 'mode-chev'));

    /* ---- 先生の方へ（折りたたまずに見せる） ---- */
    var teacher = h('div', { class: 'teacher-cta', id: 'teacher' },
      h('div', { class: 'teacher-cta-text' },
        h('p', { class: 'teacher-cta-title' }, '先生の方へ'),
        h('p', null, '難易度を選んでボタンを押すだけで、自習課題のリンクや演習プリントを作れます。')),
      h('div', { class: 'inline wrap' },
        h('a', { class: 'btn btn-primary', href: '#/teacher' }, ui.icon('doc'), '課題・プリントをつくる'),
        h('a', { class: 'btn btn-outline', href: '#/howto?for=teacher' }, ui.icon('book'), '先生向けマニュアル')));

    var foot = h('footer', { class: 'site-foot' },
      h('p', null, '表の数値は学習用の架空のものです。学習記録はこの端末のブラウザにだけ保存され、別の端末には引き継がれません。'),
      h('button', {
        type: 'button', class: 'btn btn-ghost btn-sm',
        on: { click: function () { if (root.confirm('この端末の学習記録（自習の進み具合・演習・結果）を削除しますか？\n保存した例題は残ります。')) { ui.store.clearLearning(); ui.toast('学習記録を削除しました'); } } }
      }, '学習記録を削除'));

    ui.append(app, [hero, modes, example, features, usage, teacher, foot]);
    return { title: '比較生産費説シミュレーター' };
  }

  TS.pages = TS.pages || {};
  TS.pages.home = render;
})(window);
