/*
 * page-sim.js — シミュレーション（自由実験・教員提示）
 *  ① 表を読む ② 配分を動かす ③ 結果を比べる ④ 機会費用と比較優位
 */
(function (root) {
  'use strict';
  var TS = root.TS, M = TS.model, ui = TS.ui, h = ui.h, Frac = TS.Frac;

  function sig(sc) { return JSON.stringify([sc.producers.length, sc.goods.length, sc.table]); }

  /** 2財のときの「財0に使う%」スライダー＋増減ボタン */
  function shareControl(label, value, onSet, idBase) {
    var range = h('input', { type: 'range', min: '0', max: '100', step: '1', value: String(value), id: idBase, class: 'range' });
    var out = h('output', { for: idBase, class: 'pct' }, value + '%');
    function set(v, fromRange) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      if (!fromRange) range.value = String(v);
      onSet(v);
    }
    range.addEventListener('input', function () { set(Number(range.value), true); });
    var minus = h('button', { type: 'button', class: 'btn btn-step', 'aria-label': label + 'を5%へらす', on: { click: function () { set(Number(range.value) - 5); } } }, '−');
    var plus = h('button', { type: 'button', class: 'btn btn-step', 'aria-label': label + 'を5%ふやす', on: { click: function () { set(Number(range.value) + 5); } } }, '＋');
    var wrap = h('div', { class: 'share-ctl' },
      h('label', { for: idBase, class: 'share-label' }, label),
      h('div', { class: 'share-row' }, minus, range, plus, out));
    return { el: wrap, range: range, out: out, setSilently: function (v) { range.value = String(v); out.textContent = v + '%'; } };
  }

  function render(app, params) {
    var sc = ui.getScenario();
    var saved = ui.store.get('simShares', null);
    var base = M.equalShares(sc.producers.length, sc.goods.length);
    var shares = (saved && saved.sig === sig(sc)) ? saved.shares : base.map(function (r) { return r.slice(); });
    var pairSel = { p: 0, q: 1, x: 0, y: 1 };

    var head = ui.pageHead('シミュレーション', [{ text: 'シミュレーション' }],
      '数字を動かして、分業と生産量の変化を試します。');
    var descP = h('p', { class: 'scenario-desc' });
    var tableBox = h('div');
    var allocBox = h('div', { class: 'alloc-grid' });
    var allocBtns = h('div', { class: 'inline wrap' });
    var resultBox = h('div', { 'aria-live': 'polite' });
    var analysisBox = h('div');

    function saveShares() { ui.store.set('simShares', { sig: sig(sc), shares: shares }); }

    /* ---- ① 表 ---- */
    function renderTable() {
      ui.clear(tableBox);
      descP.textContent = (sc.title ? '【' + sc.title + '】' : '') + (sc.description || '');
      tableBox.appendChild(ui.dataTable(sc));
    }
    var editor = new TS.ScenarioEditor(sc, {
      layout: 'stack',
      onChange: function (s) {
        var resized = s.producers.length !== sc.producers.length || s.goods.length !== sc.goods.length;
        sc = s; ui.setScenario(s);
        base = M.equalShares(sc.producers.length, sc.goods.length);
        if (resized) { shares = base.map(function (r) { return r.slice(); }); pairSel = { p: 0, q: 1, x: 0, y: 1 }; }
        renderTable(); renderAlloc(); renderResult(); renderAnalysis(); saveShares();
      }
    });
    var editDetails = h('details', { class: 'more' },
      h('summary', null, '表を編集する（自由実験）'),
      h('div', { class: 'more-body' }, editor.el,
        h('p', { class: 'muted small' }, '変更はすぐ反映され、この端末に保存されます。トップの「例題設定」と同じ内容です。')));

    /* ---- ② 配分 ---- */
    var controls = []; // controls[i] = [{...} per good] or single for n=2
    var outputs = [];  // outputs[i] = 生産量表示ノード
    function renderAlloc() {
      ui.clear(allocBox); controls = []; outputs = [];
      var n = sc.goods.length;
      sc.producers.forEach(function (p, i) {
        var card = h('div', { class: 'alloc-card' }, h('h3', null, p));
        var out = h('p', { class: 'alloc-out' });
        if (n === 2) {
          var ctl = shareControl(sc.goods[0] + 'に使う時間の割合', shares[i][0], function (v) {
            shares[i] = [v, 100 - v];
            ctl.out.textContent = v + '%';
            split.textContent = sc.goods[0] + ' ' + v + '% ／ ' + sc.goods[1] + ' ' + (100 - v) + '%';
            update();
          }, 'sh-' + i);
          var split = h('p', { class: 'split' }, sc.goods[0] + ' ' + shares[i][0] + '% ／ ' + sc.goods[1] + ' ' + shares[i][1] + '%');
          card.appendChild(ctl.el); card.appendChild(split);
          controls.push([ctl]);
        } else {
          var row = [];
          sc.goods.forEach(function (g, j) {
            var c = shareControl(g, shares[i][j], function (v) {
              shares[i] = M.rebalanceRow(shares[i], j, v);
              row.forEach(function (cc, k) { cc.setSilently(shares[i][k]); });
              update();
            }, 'sh-' + i + '-' + j);
            row.push(c);
            card.appendChild(c.el);
          });
          card.appendChild(h('p', { class: 'muted small' }, '1つを動かすと、残りの割合が自動で調整されて合計100%になります。'));
          controls.push(row);
        }
        card.appendChild(out);
        outputs.push(out);
        allocBox.appendChild(card);
      });
      updateOutputs();

      ui.clear(allocBtns);
      allocBtns.appendChild(h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { setAll(base); } } }, ui.icon('reset'), '基準（均等）に戻す'));
      if (sc.producers.length === 2 && sc.goods.length === 2) {
        var pr = M.analyzePair(sc.table, 0, 1, 0, 1);
        if (!pr.tie) allocBtns.appendChild(h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { setAll(M.specializationShares(sc, pr)); } } }, '比較優位どおりに完全分業'));
      }
    }
    function setAll(sh) {
      shares = sh.map(function (r) { return r.slice(); });
      controls.forEach(function (row, i) {
        if (row.length === 1 && sc.goods.length === 2) { row[0].setSilently(shares[i][0]); var sp = row[0].el.parentNode.querySelector('.split'); if (sp) sp.textContent = sc.goods[0] + ' ' + shares[i][0] + '% ／ ' + sc.goods[1] + ' ' + shares[i][1] + '%'; }
        else row.forEach(function (c, j) { c.setSilently(shares[i][j]); });
      });
      update();
    }
    function updateOutputs() {
      var prod = M.production(sc, shares);
      outputs.forEach(function (out, i) {
        out.textContent = '生産量：' + sc.goods.map(function (g, j) { return g + ' ' + ui.fmt(prod.perProducer[i][j]) + '個'; }).join('、');
      });
    }
    function update() { updateOutputs(); renderResult(); saveShares(); }

    /* ---- ③ 結果 ---- */
    function renderResult() {
      ui.clear(resultBox);
      var b = M.production(sc, base).total, c = M.production(sc, shares).total;
      var cmp = M.compareTotals(b, c);
      var max = 0;
      b.concat(c).forEach(function (f) { max = Math.max(max, f.toNumber()); });
      var tbl = h('table', { class: 'data-table result-table' },
        h('caption', { class: 'sr-only' }, '基準の配分と今の配分の総生産量'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, '商品'), h('th', { scope: 'col' }, '基準（均等）'), h('th', { scope: 'col' }, '今の配分'), h('th', { scope: 'col' }, '差'))),
        h('tbody', null, sc.goods.map(function (g, j) {
          var r = cmp[j];
          return h('tr', null, h('th', { scope: 'row' }, g), h('td', null, ui.fmt(r.base) + '個'), h('td', { class: 'strong' }, ui.fmt(r.cur) + '個'),
            h('td', { class: r.sign > 0 ? 'up' : (r.sign < 0 ? 'down' : '') }, ui.signText(r.sign, r.delta)));
        })));
      var bars = h('div', { class: 'bars', 'aria-hidden': 'true' }, sc.goods.map(function (g, j) {
        var w1 = max ? (b[j].toNumber() / max * 100) : 0, w2 = max ? (c[j].toNumber() / max * 100) : 0;
        return h('div', { class: 'bar-group' }, h('div', { class: 'bar-label' }, g),
          h('div', { class: 'bar-line' }, h('span', { class: 'bar base', style: { width: w1 + '%' } }), h('span', { class: 'bar-num' }, ui.fmt(b[j]))),
          h('div', { class: 'bar-line' }, h('span', { class: 'bar cur', style: { width: w2 + '%' } }), h('span', { class: 'bar-num' }, ui.fmt(c[j]))));
      }));
      var ups = [], downs = [];
      cmp.forEach(function (r, j) { if (r.sign > 0) ups.push(sc.goods[j]); if (r.sign < 0) downs.push(sc.goods[j]); });
      var summary;
      if (!ups.length && !downs.length) summary = '基準の配分と同じ合計です。スライダーを動かしてみましょう。';
      else if (ups.length && !downs.length) summary = '基準と比べて、' + ups.join('・') + 'がふえ、へった商品はありません。';
      else if (!ups.length) summary = '基準と比べて、' + downs.join('・') + 'がへりました。';
      else summary = '基準と比べて、' + ups.join('・') + 'はふえ、' + downs.join('・') + 'はへりました。';
      ui.append(resultBox, [
        h('p', { class: 'result-summary' }, summary),
        h('div', { class: 'table-wrap' }, tbl),
        h('div', { class: 'legend' }, h('span', { class: 'key base' }), '基準（均等）', h('span', { class: 'key cur' }), '今の配分'),
        bars,
        h('p', { class: 'muted small' }, 'どちらの配分が「よい」かは、どの商品をいくつ必要とするか（何を基準に比べるか）で変わります。ここでは合計の増減だけを示しています。')
      ]);
    }

    /* ---- ④ 機会費用と比較優位 ---- */
    function select(label, options, value, onPick, id) {
      var sel = h('select', { class: 'select', id: id, on: { change: function () { onPick(Number(sel.value)); } } },
        options.map(function (o, k) { return h('option', { value: String(k), selected: k === value }, o); }));
      return h('div', { class: 'field-inline' }, h('label', { for: id }, label), sel);
    }
    function renderAnalysis() {
      ui.clear(analysisBox);
      var big = sc.producers.length > 2 || sc.goods.length > 2;
      if (big) {
        analysisBox.appendChild(h('div', { class: 'note' },
          h('p', null, '3か国以上・3財以上では、全体で「どこが何をつくるか」を1つに決めるには、何を最大にするか（どの商品がいくつ必要か等）の条件が必要です。このアプリでは自動判定せず、2つずつ選んで比べます。')));
        analysisBox.appendChild(h('div', { class: 'pair-pick' },
          select('比べる1つ目', sc.producers, pairSel.p, function (v) { pairSel.p = v; renderAnalysis(); }, 'pp'),
          select('2つ目', sc.producers, pairSel.q, function (v) { pairSel.q = v; renderAnalysis(); }, 'pq'),
          select('商品1', sc.goods, pairSel.x, function (v) { pairSel.x = v; renderAnalysis(); }, 'px'),
          select('商品2', sc.goods, pairSel.y, function (v) { pairSel.y = v; renderAnalysis(); }, 'py')));
        if (pairSel.p === pairSel.q || pairSel.x === pairSel.y) {
          analysisBox.appendChild(h('p', { class: 'warn' }, 'ちがう2つの国（生産者）と、ちがう2つの商品を選んでください。'));
          return;
        }
      }
      var p = pairSel.p, q = pairSel.q, x = pairSel.x, y = pairSel.y;
      var A = M.analyzePair(sc.table, p, q, x, y);
      var P = sc.producers, G = sc.goods, t = sc.table;
      function absLine(g, key) {
        var w = A.abs[key];
        return h('li', null, G[g] + '：' + P[p] + ' ' + t[p][g] + '個、' + P[q] + ' ' + t[q][g] + '個 → ',
          h('strong', null, w === null ? '同じ（差なし）' : w === p ? P[p] + 'が多い' : P[q] + 'が多い'));
      }
      var ocT = h('table', { class: 'data-table oc-table' },
        h('caption', { class: 'sr-only' }, '機会費用（1個つくるとき、あきらめる量）'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, ''),
          h('th', { scope: 'col' }, G[x] + 'を1個つくると、' + G[y] + 'を…'),
          h('th', { scope: 'col' }, G[y] + 'を1個つくると、' + G[x] + 'を…'))),
        h('tbody', null, [p, q].map(function (i) {
          var other = i === p ? q : p;
          function cell(key, g1, g2) {
            var mine = A.oc[i][key], theirs = A.oc[other][key];
            var small = mine.cmp(theirs) < 0;
            return h('td', { class: small ? 'hl' : null },
              h('span', { class: 'calc' }, t[i][g2] + '÷' + t[i][g1] + '＝'),
              h('strong', null, ui.fmt(mine) + '個'),
              small ? h('span', { class: 'tag' }, '小さい') : null);
          }
          return h('tr', null, h('th', { scope: 'row' }, P[i]), cell('x', x, y), cell('y', y, x));
        })));
      var conclusion = A.tie
        ? h('p', { class: 'conclusion' }, '機会費用が同じなので、この2つの間では比較優位に差はありません。')
        : h('p', { class: 'conclusion' },
          G[x] + 'の比較優位：', h('strong', null, P[A.comp.x]), '　／　' + G[y] + 'の比較優位：', h('strong', null, P[A.comp.y]),
          h('br'), h('span', { class: 'small' }, '（あきらめる量＝機会費用が小さい方に、比較優位があります）'));
      var extra = null;
      if (A.bothAbs !== null && !A.tie) {
        extra = h('p', { class: 'note' }, P[A.bothAbs] + 'は両方の商品で多く作れます（絶対優位）。それでも、比較優位は' +
          (A.comp.x === A.bothAbs ? G[x] : G[y]) + 'だけにあります。「多く作れる」と「比較優位」は別のものです。');
      }
      ui.append(analysisBox, [
        h('h3', { class: 'mini-title' }, '絶対優位（同じ労働量で多く作れるのは？）'),
        h('ul', { class: 'plain' }, absLine(x, 'x'), absLine(y, 'y')),
        h('h3', { class: 'mini-title' }, '機会費用（1個つくるとき、あきらめる量）'),
        h('div', { class: 'table-wrap' }, ocT),
        conclusion, extra,
        h('details', { class: 'why' }, h('summary', null, ui.icon('bulb'), 'なぜそうなる？'),
          h('div', null,
            h('p', null, P[p] + 'は同じ時間で' + G[x] + 'を' + t[p][x] + '個、または' + G[y] + 'を' + t[p][y] + '個つくれます。つまり' + G[x] + 'を1個ふやすには、' + G[y] + 'を ' + t[p][y] + '÷' + t[p][x] + '＝' + ui.fmt(A.oc[p].x) + '個 あきらめる必要があります。これが機会費用です。'),
            h('p', null, 'あきらめる量が小さい＝ほかの商品と比べて相対的に得意、ということです。だから「多く作れるか（絶対優位）」ではなく、機会費用の大小で比較優位を決めます。'))),
        h('p', { class: 'muted small' }, 'モデルの前提：生産性は一定、労働は自由に分けられる、規模に関して収穫一定。数値は架空です。')
      ]);
    }

    /* ---- 組み立て ---- */
    var introBanner = null;
    if (params.intro) {
      introBanner = h('div', { class: 'intro-banner' },
        h('h2', null, '授業導入（5分）'),
        h('ol', null,
          h('li', null, h('strong', null, '予想：'), '「表の左側の人は両方たくさん作れる。それでも分担する意味はある？」と問いかけ、手をあげて予想。'),
          h('li', null, h('strong', null, '操作：'), '②のスライダーを動かし、基準（50%ずつ）より両方の合計がふえる配分を探す。'),
          h('li', null, h('strong', null, '確認：'), '③で増減を見て、「完全分業」ボタンでは減る商品もあることを確認。④の機会費用で理由を説明。')),
        h('p', { class: 'muted small' }, '例題はトップの「例題設定」で変えられます。'));
    }
    var guide = h('ol', { class: 'step-guide no-print', 'aria-label': 'この画面の進め方' },
      [['s1', '表を読む'], ['s2', '配分を動かす'], ['s3', '結果を比べる'], ['s4', '機会費用を見る']].map(function (s, k) {
        return h('li', null, h('a', { href: '#' + s[0], on: { click: function (e) { e.preventDefault(); document.getElementById(s[0]).scrollIntoView({ behavior: 'smooth' }); } } }, h('span', { class: 'num' }, String(k + 1)), s[1]));
      }));

    renderTable(); renderAlloc(); renderResult(); renderAnalysis();
    ui.append(app, [head, introBanner, guide,
      ui.section('① 表を読む', h('div', { class: 'panel' }, descP, tableBox, editDetails), { id: 's1' }),
      ui.section('② 配分を動かす', h('div', { class: 'panel' },
        h('p', null, '各' + (sc.kind === 'countries' ? '国' : '人') + 'が、使える時間のうち何%をどの商品に使うかを決めます。'),
        allocBox, allocBtns), { id: 's2' }),
      ui.section('③ 結果を比べる', h('div', { class: 'panel' }, resultBox), { id: 's3' }),
      ui.section('④ 機会費用と比較優位', h('div', { class: 'panel' }, analysisBox), { id: 's4' }),
      h('div', { class: 'next-row no-print' },
        h('a', { class: 'btn btn-outline', href: '#/' }, ui.icon('back'), 'ホームへ'),
        h('a', { class: 'btn btn-primary', href: '#/practice' }, '演習問題へ', ui.icon('chevron')))
    ]);
    return { title: 'シミュレーション' };
  }

  TS.pages = TS.pages || {};
  TS.pages.sim = render;
})(window);
