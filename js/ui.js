/*
 * ui.js — 画面共通の部品
 *  - h()：DOM生成。文字列は必ず textContent で入れる（国名・商品名をHTMLとして解釈しない＝XSS対策）
 *  - アイコン（固定のSVG文字列のみ innerHTML を使う）
 *  - localStorage の安全なラッパー、現在の例題、印刷、コピー
 */
(function (root) {
  'use strict';
  var TS = root.TS;
  var M = TS.model;

  /* ---------- DOM ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { el.style[s] = v[s]; });
        else if (k === 'html') throw new Error('h(): html属性は使えません');
        else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /* ---------- アイコン（固定SVG） ---------- */
  var ICONS = {
    cap: '<svg viewBox="0 0 32 32"><path d="M16 5 1 12l15 7 12-5.6V22h2.5v-9.8L31 12z" fill="#1f5fae"/><path d="M7 16.5v5.2c0 2.5 4 4.8 9 4.8s9-2.3 9-4.8v-5.2l-9 4.2z" fill="#3b7fd0"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z"/><path d="M12 6.5v13"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.4a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.2 1-1.2 1.8v.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="#2c62a8" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.6 0 4.3 1.5 4.9 4.3"/></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="#2c62a8" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="#2c62a8" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="m14 7 3.5 3.5"/></svg>',
    laptop: '<svg viewBox="0 0 64 56"><rect x="9" y="6" width="46" height="31" rx="3" fill="#fff" stroke="#1f5fae" stroke-width="3.2"/><rect x="18" y="22" width="6" height="10" fill="#2f73d0"/><rect x="28" y="16" width="6" height="16" fill="#2f73d0"/><rect x="38" y="11" width="6" height="21" fill="#1f5fae"/><path d="M3 41h58l-3.5 6.5h-51z" fill="#1f5fae"/></svg>',
    checklist: '<svg viewBox="0 0 64 60"><rect x="6" y="5" width="40" height="50" rx="4" fill="#fff" stroke="#2f8a57" stroke-width="3"/><path d="m12 17 3 3 5-6M12 30l3 3 5-6M12 43l3 3 5-6" fill="none" stroke="#2f8a57" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 17h14M25 30h14M25 43h9" stroke="#2f8a57" stroke-width="2.6" stroke-linecap="round"/><path d="M38 50 55 26l5 4-17 24-6.5 2.5z" fill="#43a86d" stroke="#2f8a57" stroke-width="2" stroke-linejoin="round"/></svg>',
    openbook: '<svg viewBox="0 0 66 52"><path d="M33 10C26 4 15 3 4 5v38c11-2 22-1 29 5 7-6 18-7 29-5V5C51 3 40 4 33 10z" fill="#fff" stroke="#6a4fbf" stroke-width="3" stroke-linejoin="round"/><path d="M33 10v38" stroke="#6a4fbf" stroke-width="3"/><path d="M10 15c6-1 12 0 17 2M10 23c6-1 12 0 17 2M10 31c6-1 12 0 17 2M39 17c5-2 11-3 17-2M39 25c5-2 11-3 17-2M39 33c5-2 11-3 17-2" stroke="#8b72d6" stroke-width="2.4" stroke-linecap="round"/></svg>',
    scale: '<svg viewBox="0 0 48 40" fill="none" stroke="#2c62a8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4v30M14 36h20M8 9h32"/><circle cx="24" cy="6" r="2.5" fill="#2c62a8"/><path d="M8 9 2 22h12zM40 9l-6 13h12z"/><path d="M2 22c0 3.3 2.7 5 6 5s6-1.7 6-5M34 22c0 3.3 2.7 5 6 5s6-1.7 6-5" fill="#cfe1f6"/></svg>',
    calc: '<svg viewBox="0 0 40 46"><rect x="4" y="2" width="32" height="42" rx="4" fill="#fff" stroke="#2f8a57" stroke-width="3"/><rect x="9" y="7" width="22" height="9" rx="1.5" fill="#cdebd8" stroke="#2f8a57" stroke-width="2"/><g fill="#2f8a57"><rect x="9" y="21" width="5" height="5" rx="1"/><rect x="17.5" y="21" width="5" height="5" rx="1"/><rect x="26" y="21" width="5" height="5" rx="1"/><rect x="9" y="29" width="5" height="5" rx="1"/><rect x="17.5" y="29" width="5" height="5" rx="1"/><rect x="26" y="29" width="5" height="5" rx="1"/><rect x="9" y="37" width="5" height="3" rx="1"/><rect x="17.5" y="37" width="5" height="3" rx="1"/><rect x="26" y="37" width="5" height="3" rx="1"/></g></svg>',
    doc: '<svg viewBox="0 0 40 46" fill="none" stroke="#6a4fbf" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="30" height="40" rx="4" fill="#fff"/><path d="M12 14h16M12 22h16M12 30h10"/></svg>',
    teacher: '<svg viewBox="0 0 56 44"><rect x="17" y="4" width="36" height="25" rx="2" fill="#fff" stroke="#1f5fae" stroke-width="3"/><path d="M24 22l7-7 5 5 9-9" fill="none" stroke="#3b7fd0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="17" r="5" fill="#1f5fae"/><path d="M2 42c0-9 3.5-14 8-14 3 0 5 1.6 6.5 4l7-5 2 2.6-9 8V42z" fill="#1f5fae"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/></svg>'
  };
  function icon(name, cls) {
    var s = h('span', { class: 'ico ' + (cls || ''), 'aria-hidden': 'true' });
    s.innerHTML = ICONS[name] || ''; // 固定文字列のみ
    return s;
  }

  /* ---------- ヒーローのイラスト（地球・貿易船・港湾クレーン） ---------- */
  function heroSVG() {
    var C = ['#f08a3c', '#3a78c8', '#d9574e', '#f2a541', '#2f9a8f', '#5b8fd6'];
    var cont = '';
    // 船の上のコンテナ（4段×9列）
    var k = 0;
    for (var row = 0; row < 4; row++) {
      var cols = row === 3 ? 5 : 9;
      for (var c = 0; c < cols; c++) {
        var x = 112 + c * 15 + (row === 3 ? 30 : 0), y = 234 - row * 13;
        cont += '<rect x="' + x + '" y="' + y + '" width="14" height="12" fill="' + C[(k * 7 + row) % C.length] + '"/>';
        cont += '<path d="M' + (x + 4.5) + ' ' + (y + 2) + 'v8M' + (x + 9.5) + ' ' + (y + 2) + 'v8" stroke="rgba(0,0,0,.18)" stroke-width="1"/>';
        k++;
      }
    }
    // 岸壁のコンテナ
    var dock = '';
    var dockPos = [[438, 262, 0], [462, 262, 1], [486, 262, 3], [450, 248, 5], [474, 248, 0], [462, 234, 1]];
    dockPos.forEach(function (d) {
      dock += '<rect x="' + d[0] + '" y="' + d[1] + '" width="23" height="13" fill="' + C[d[2]] + '"/>' +
        '<path d="M' + (d[0] + 6) + ' ' + (d[1] + 2) + 'v9M' + (d[0] + 11.5) + ' ' + (d[1] + 2) + 'v9M' + (d[0] + 17) + ' ' + (d[1] + 2) + 'v9" stroke="rgba(0,0,0,.18)"/>';
    });
    var svg =
      '<svg viewBox="0 0 520 330" role="img" aria-label="地球と貿易船、港のクレーンのイラスト">' +
      '<defs>' +
      '<radialGradient id="gOcean" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#d7ebfc"/><stop offset=".55" stop-color="#8fc0ee"/><stop offset="1" stop-color="#4f8fd6"/></radialGradient>' +
      '<linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0fa"/><stop offset="1" stop-color="#e6f3fd"/></linearGradient>' +
      '<clipPath id="cGlobe"><circle cx="318" cy="150" r="118"/></clipPath>' +
      '</defs>' +
      // 雲
      '<g fill="#d8eafb"><path d="M118 72a14 14 0 0 1 27-6 11 11 0 0 1 17 9h-44z"/><path d="M430 52a16 16 0 0 1 31-7 12 12 0 0 1 19 10h-50z"/><path d="M448 112a9 9 0 0 1 17-4 8 8 0 0 1 12 6h-29z" opacity=".8"/></g>' +
      // 地球
      '<circle cx="318" cy="150" r="118" fill="url(#gOcean)"/>' +
      '<g clip-path="url(#cGlobe)" fill="#eaf4fe" opacity=".92">' +
      '<path d="M206 72c22-22 72-28 96-12 16 10 8 30-10 35-11 4-6 19-22 29-11 10-19 26-31 15-10-10-15-25-28-30-12-10-15-25-5-37z"/>' +
      '<path d="M270 162c16-6 31 4 28 25-2 20-14 40-22 60-4 10-12 5-11-7 2-18-7-33-5-50 1-14 2-24 10-28z"/>' +
      '<path d="M336 70c20-10 47-5 57 10 7 12-5 20-13 25 13 5 26 20 23 40-3 25-15 45-27 65-8 12-18 10-20-5-2-15-8-30-16-45-8-12-12-25-4-38-8-10-10-22-3-32-5-8-3-15 3-20z"/>' +
      '<path d="M398 62c22-6 42 16 46 38 2 15-9 20-20 14-11-5-20-16-24-28z"/>' +
      '<path d="M298 38c13-6 29-1 24 12-5 7-19 5-24-3z"/>' +
      '</g>' +
      '<ellipse cx="270" cy="92" rx="52" ry="30" fill="#fff" opacity=".22" transform="rotate(-25 270 92)"/>' +
      '<circle cx="318" cy="150" r="118" fill="none" stroke="#5c97d8" stroke-width="2" opacity=".5"/>' +
      // 海
      '<path d="M8 268c30-12 62-12 92-2s64 10 96 0 64-10 96 0 64 10 96 0 64-10 96 0 20 4 28 6v44c-6 8-20 12-40 12H44c-22 0-36-6-36-16z" fill="url(#gWater)"/>' +
      '<path d="M40 300c20-6 40-6 60 0s40 6 60 0M300 304c20-6 40-6 60 0s40 6 60 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>' +
      // クレーン
      '<g stroke="#2a64b0" stroke-width="5" stroke-linecap="square" fill="none">' +
      '<path d="M452 276V96M496 276V96"/><path d="M452 96h44"/>' +
      '<path d="M452 130l44 30M496 130l-44 30M452 180l44 30M496 180l-44 30M452 228l44 30M496 228l-44 30" stroke-width="3"/>' +
      '<path d="M396 100h124" stroke-width="7"/>' +
      '<path d="M474 96l-6-22 12 0z" stroke-width="3"/>' +
      '<path d="M474 74 400 100M474 74l46 26" stroke-width="2.5"/>' +
      '</g>' +
      '<path d="M418 104v34" stroke="#365" stroke-width="1.6"/>' +
      '<rect x="404" y="138" width="28" height="15" fill="#f08a3c"/><path d="M411 140v11M418 140v11M425 140v11" stroke="rgba(0,0,0,.2)"/>' +
      '<rect x="428" y="276" width="92" height="8" fill="#9fb8d6"/>' + dock +
      // 船
      '<path d="M30 246h236l-22 40H58z" fill="#24497d"/>' +
      '<path d="M30 246h236l-4 8H34z" fill="#3a6aa8"/>' +
      '<path d="M58 286h186l2-6H55z" fill="#c6463e"/>' +
      '<g fill="#fff" stroke="#9ab4d4" stroke-width="1"><rect x="48" y="200" width="44" height="46" rx="2"/><rect x="56" y="186" width="30" height="14"/></g>' +
      '<g fill="#2b5f9e"><rect x="54" y="208" width="6" height="5"/><rect x="64" y="208" width="6" height="5"/><rect x="74" y="208" width="6" height="5"/><rect x="84" y="208" width="5" height="5"/><rect x="54" y="220" width="6" height="5"/><rect x="64" y="220" width="6" height="5"/><rect x="74" y="220" width="6" height="5"/><rect x="60" y="190" width="22" height="5"/></g>' +
      '<rect x="68" y="172" width="6" height="14" fill="#c6463e"/>' +
      cont +
      '</svg>';
    var wrap = h('div', { class: 'hero-art' });
    wrap.innerHTML = svg; // 固定文字列のみ
    return wrap;
  }

  /* ---------- 保存（localStorage） ---------- */
  var PREFIX = 'trade-sim.';
  var store = {
    get: function (key, fallback) {
      try { var s = root.localStorage.getItem(PREFIX + key); return s === null ? fallback : JSON.parse(s); }
      catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { root.localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    remove: function (key) { try { root.localStorage.removeItem(PREFIX + key); } catch (e) { /* 無視 */ } },
    /** 学習記録（自習・演習・結果）だけを削除。保存した例題は残す */
    clearLearning: function () { ['study', 'quiz', 'results'].forEach(store.remove); }
  };

  /* ---------- 現在の例題 ---------- */
  function getScenario() {
    var sc = store.get('scenario', null);
    if (sc && M.validateScenario(sc).ok) return sc;
    return M.defaultScenario();
  }
  function setScenario(sc) { store.set('scenario', sc); }

  /* ---------- 表の表示 ---------- */
  /** 生産量表（読み取り専用）。opts.highlight: [[i,j],...] */
  function dataTable(sc, opts) {
    opts = opts || {};
    var tbl = h('table', { class: 'data-table' + (opts.small ? ' small' : '') });
    if (opts.caption !== false) tbl.appendChild(h('caption', { class: 'sr-only' }, opts.caption || '同じ労働量で作れる量（個）'));
    var trh = h('tr', null, h('th', { scope: 'col', class: 'corner' }, opts.corner || ''));
    sc.goods.forEach(function (g) { trh.appendChild(h('th', { scope: 'col' }, g)); });
    tbl.appendChild(h('thead', null, trh));
    var tb = h('tbody');
    sc.producers.forEach(function (p, i) {
      var tr = h('tr', null, h('th', { scope: 'row' }, p));
      sc.goods.forEach(function (g, j) {
        var hl = opts.highlight && opts.highlight.some(function (c) { return c[0] === i && c[1] === j; });
        tr.appendChild(h('td', { class: hl ? 'hl' : null }, String(sc.table[i][j]) + (opts.unit === false ? '' : '個')));
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    return h('div', { class: 'table-wrap' }, tbl);
  }

  /* ---------- 表示の補助 ---------- */
  function fmt(f) { return TS.Frac.from(f).toDisplay(); }
  function signText(c, d) {
    if (c > 0) return '＋' + fmt(d) + '（ふえた）';
    if (c < 0) return '−' + fmt(d.mul(-1)) + '（へった）';
    return '±0（同じ）';
  }

  /** ページ上部の帰り道 */
  function pageHead(title, crumbs, lead) {
    var nav = h('nav', { class: 'crumbs no-print', 'aria-label': 'パンくずリスト' },
      h('a', { href: '#/' }, icon('home'), 'ホーム'));
    (crumbs || []).forEach(function (c) { nav.appendChild(h('span', { 'aria-hidden': 'true' }, '›')); nav.appendChild(c.href ? h('a', { href: c.href }, c.text) : h('span', null, c.text)); });
    return h('header', { class: 'page-head' }, nav,
      h('h1', { class: 'page-title', tabindex: '-1' }, title),
      lead ? h('p', { class: 'lead' }, lead) : null);
  }

  function section(title, body, attrs) {
    attrs = attrs || {};
    return h('section', { class: 'sec ' + (attrs.class || ''), id: attrs.id || null },
      h('h2', { class: 'sec-title' }, title), body);
  }

  /** 静かな通知（音・派手な演出なし） */
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /**
   * クリップボードにコピーする。成功したら true、失敗したら false で終わる Promise を返す。
   * （成功を確かめる前に「コピーしました」と表示しないため）
   */
  function copyText(text, opts) {
    opts = opts || {};
    function fallback() {
      var ta = h('textarea', { class: 'sr-only', readonly: true });
      ta.value = text;
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* iPad/iPhone の Safari 向け */ }
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
    var p = (navigator.clipboard && root.isSecureContext)
      ? navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); })
      : Promise.resolve(fallback());
    return p.then(function (ok) {
      if (!opts.quiet) toast(ok ? 'コピーしました' : 'コピーできませんでした。リンクの欄を長押し（パソコンは選択）してコピーしてください。');
      return ok;
    });
  }

  /** 印刷用シートを #print-root に入れて印刷 */
  function printSheet(nodes) {
    var rootEl = document.getElementById('print-root');
    clear(rootEl);
    append(rootEl, nodes);
    document.body.classList.add('print-sheet');
    // iPad/iPhone の Safari は print() がすぐ戻るので、時間で戻さず「印刷が終わったとき」か「画面を移ったとき」に戻す
    var done = function () { document.body.classList.remove('print-sheet'); root.removeEventListener('afterprint', done); };
    root.addEventListener('afterprint', done);
    setTimeout(function () { root.print(); }, 50);
  }
  /** 今の画面を印刷 */
  function printPage() { document.body.classList.remove('print-sheet'); root.print(); }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  TS.ui = {
    h: h, append: append, clear: clear, icon: icon, heroSVG: heroSVG,
    store: store, getScenario: getScenario, setScenario: setScenario,
    dataTable: dataTable, fmt: fmt, signText: signText, pageHead: pageHead, section: section,
    toast: toast, copyText: copyText, printSheet: printSheet, printPage: printPage, todayStr: todayStr
  };
})(window);
