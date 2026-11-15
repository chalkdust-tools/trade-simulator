/*
 * app.js — ハッシュによる画面切り替え（ブラウザの「戻る」に対応）
 *   #/            トップ
 *   #/sim         シミュレーション（?intro=1）
 *   #/practice    演習問題（?d=intro|standard&n=5&seed=123&start=1）
 *   #/study       自習モード（?course=intro|standard&len=15|30）
 *   #/results     学習結果
 *   #/howto       使い方
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui;

  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#/, '');
    var q = raw.indexOf('?');
    var path = (q >= 0 ? raw.slice(0, q) : raw).replace(/^\/?/, '/').replace(/\/$/, '') || '/';
    var params = {};
    if (q >= 0) raw.slice(q + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      try { params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) { /* 無視 */ }
    });
    return { path: path, params: params };
  }

  var ROUTES = { '/': 'home', '/sim': 'sim', '/practice': 'practice', '/study': 'study', '/results': 'results', '/howto': 'howto' };

  function route() {
    var r = parseHash();
    var name = ROUTES[r.path] || 'home';
    var app = document.getElementById('app');
    document.body.classList.remove('print-sheet');
    ui.clear(app);
    app.className = 'page page-' + name;
    var info;
    try {
      info = TS.pages[name](app, r.params) || {};
    } catch (e) {
      ui.clear(app);
      app.appendChild(ui.h('div', { class: 'panel' }, ui.h('p', null, '画面の表示中に問題が起きました。保存データが壊れている可能性があります。'),
        ui.h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { ui.store.clearLearning(); location.hash = '#/'; location.reload(); } } }, '学習記録を削除してトップへ')));
      if (root.console) console.error(e);
      info = {};
    }
    document.title = info.title && info.title !== '比較生産費説シミュレーター' ? info.title + '｜比較生産費説シミュレーター' : '比較生産費説シミュレーター';
    root.scrollTo(0, 0);
    var focusT = app.querySelector('h1');
    if (focusT && name !== 'home') focusT.focus({ preventScroll: true });
  }

  root.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', function () {
    // 「本文へスキップ」はハッシュを変えずに本文へ移動（画面切り替えに使うハッシュを壊さない）
    var skip = document.querySelector('.skip');
    if (skip) skip.addEventListener('click', function (e) { e.preventDefault(); var a = document.getElementById('app'); a.focus(); a.scrollIntoView(); });
    route();
  });
})(window);
