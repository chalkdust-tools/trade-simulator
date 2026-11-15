/*
 * model.js — 比較生産費説の計算モデル（画面から独立。Nodeでテスト可能）
 *
 * 記号（仕様書5章）
 *   a[i][j] : 生産者 i が労働資源1単位をすべて財 j に使ったときの最大生産量
 *   L[i]    : 生産者 i の利用可能労働量（第1段階は 1 で固定）
 *   s[i][j] : 財 j に配分する労働の割合（画面では % の整数、合計100）
 *   Q[j]    = Σ_i a[i][j] * L[i] * s[i][j]
 *
 * 前提（モデルの限界）：生産性は一定、労働は自由に分割できる、規模に関して収穫一定。
 */
(function (root) {
  'use strict';
  var Frac = (typeof module !== 'undefined' && module.exports) ? require('./fraction.js') : root.TS.Frac;

  var LIMITS = { minSize: 2, maxSize: 4, maxValue: 9999, maxDecimals: 2, maxLabel: 16 };

  var ALPHA = ['A', 'B', 'C', 'D'];

  /* ---------- 例題（シナリオ） ---------- */

  function defaultLabels(kind, count) {
    var out = [];
    for (var i = 0; i < count; i++) out.push(kind === 'countries' ? ALPHA[i] + '国' : ALPHA[i] + 'さん');
    return out;
  }
  function defaultGoods(count) {
    var out = [];
    for (var j = 0; j < count; j++) out.push('商品' + ALPHA[j]);
    return out;
  }

  /** 授業プリントの共通初期例題（仕様書4-2） */
  function defaultScenario() {
    return {
      title: 'AさんとBさんの分業',
      description: 'AさんとBさんは、1日で商品Aと商品Bを作れます。表は、1日をすべてその商品に使ったときに作れる数です。数値は架空のものです。',
      kind: 'people',
      tableType: 'output',
      producers: ['Aさん', 'Bさん'],
      goods: ['商品A', '商品B'],
      table: [[10, 5], [6, 4]],
      labor: [1, 1]
    };
  }

  var PRESETS = [
    { id: 'print', name: 'AさんとBさん（授業プリント）', make: defaultScenario },
    {
      id: 'countries', name: 'A国とB国（得意な商品がちがう）',
      make: function () {
        return {
          title: 'A国とB国', description: 'A国とB国が、同じ労働量で作れる量の例です。数値は架空のものです。',
          kind: 'countries', tableType: 'output',
          producers: ['A国', 'B国'], goods: ['商品A', '商品B'],
          table: [[10, 5], [4, 8]], labor: [1, 1]
        };
      }
    },
    {
      id: 'c3', name: '3国×3財（考察用）',
      make: function () {
        return {
          title: '3国×3財', description: '3か国・3財の架空の例です。何を基準に「よい配分」とするかで答えが変わります。',
          kind: 'countries', tableType: 'output',
          producers: ['A国', 'B国', 'C国'], goods: ['商品A', '商品B', '商品C'],
          table: [[12, 6, 4], [6, 6, 3], [4, 2, 4]], labor: [1, 1, 1]
        };
      }
    },
    {
      id: 'c4', name: '4国×4財（考察用）',
      make: function () {
        return {
          title: '4国×4財', description: '4か国・4財の架空の例です。2国・2財を選んで比べることができます。',
          kind: 'countries', tableType: 'output',
          producers: ['A国', 'B国', 'C国', 'D国'], goods: ['商品A', '商品B', '商品C', '商品D'],
          table: [[12, 8, 6, 4], [6, 6, 4, 2], [8, 4, 8, 6], [3, 3, 3, 6]], labor: [1, 1, 1, 1]
        };
      }
    }
  ];

  function cloneScenario(sc) { return JSON.parse(JSON.stringify(sc)); }

  /** 国数・財数を変える。既存の値・名前はできるだけ残す */
  function resizeScenario(sc, m, n) {
    var out = cloneScenario(sc);
    var defP = defaultLabels(sc.kind, m), defG = defaultGoods(n);
    out.producers = []; out.goods = []; out.table = []; out.labor = [];
    for (var i = 0; i < m; i++) {
      out.producers.push(sc.producers[i] !== undefined ? sc.producers[i] : defP[i]);
      out.labor.push(sc.labor && sc.labor[i] !== undefined ? sc.labor[i] : 1);
      var row = [];
      for (var j = 0; j < n; j++) {
        var v = sc.table[i] && sc.table[i][j];
        row.push(v !== undefined ? v : ((i + j) % 3) * 2 + 4);
      }
      out.table.push(row);
    }
    for (var k = 0; k < n; k++) out.goods.push(sc.goods[k] !== undefined ? sc.goods[k] : defG[k]);
    return out;
  }

  /* ---------- 入力検査（仕様書4-3） ---------- */

  /** 1つのセルの文字列を検査。{ok, value, msg} */
  function parseCell(text) {
    var s = String(text === undefined || text === null ? '' : text);
    s = toHalfWidth(s).trim();
    if (s === '') return { ok: false, msg: '空欄です。数を入れてください。' };
    if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) {
      if (/^-/.test(s)) return { ok: false, msg: 'マイナスの数は使えません。' };
      return { ok: false, msg: '数字だけを入れてください（例：10、2.5）。' };
    }
    var v = Number(s);
    if (!isFinite(v)) return { ok: false, msg: '数として読めません。' };
    if (v <= 0) return { ok: false, msg: '0は使えません。1つも作れない場合は、このモデルでは扱えません。' };
    if (v > LIMITS.maxValue) return { ok: false, msg: LIMITS.maxValue + 'より大きい数は使えません。' };
    var dec = (s.split('.')[1] || '').length;
    if (dec > LIMITS.maxDecimals) return { ok: false, msg: '小数は第' + LIMITS.maxDecimals + '位までにしてください。' };
    return { ok: true, value: v };
  }

  function toHalfWidth(s) {
    return String(s).replace(/[０-９．／－]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    }).replace(/ー/g, '-').replace(/[　]/g, ' ');
  }

  function validateScenario(sc) {
    var errors = [];
    if (!sc || typeof sc !== 'object') return { ok: false, errors: ['例題のデータが読めません。'] };
    var m = sc.producers && sc.producers.length, n = sc.goods && sc.goods.length;
    if (!(m >= LIMITS.minSize && m <= LIMITS.maxSize)) errors.push('国・生産者の数は2〜4にしてください。');
    if (!(n >= LIMITS.minSize && n <= LIMITS.maxSize)) errors.push('生産物の数は2〜4にしてください。');
    if (errors.length) return { ok: false, errors: errors };
    function checkLabels(arr, what) {
      var seen = {};
      arr.forEach(function (l, k) {
        if (typeof l !== 'string' || l.trim() === '') errors.push(what + (k + 1) + 'の名前が空欄です。');
        else if (l.length > LIMITS.maxLabel) errors.push(what + (k + 1) + 'の名前は' + LIMITS.maxLabel + '文字以内にしてください。');
        else if (seen[l.trim()]) errors.push('「' + l + '」が2回使われています。名前は区別できるようにしてください。');
        else seen[l.trim()] = true;
      });
    }
    checkLabels(sc.producers, '国・生産者');
    checkLabels(sc.goods, '生産物');
    if (!Array.isArray(sc.table) || sc.table.length !== m) errors.push('数値表の行数が合っていません。');
    else {
      sc.table.forEach(function (row, i) {
        if (!Array.isArray(row) || row.length !== n) { errors.push('数値表の列数が合っていません。'); return; }
        row.forEach(function (v, j) {
          var r = parseCell(v);
          if (!r.ok) errors.push((sc.producers[i] || '') + '・' + (sc.goods[j] || '') + '：' + r.msg);
        });
      });
    }
    if (sc.labor) sc.labor.forEach(function (L) { if (!(typeof L === 'number' && isFinite(L) && L > 0)) errors.push('労働量は正の数にしてください。'); });
    return { ok: errors.length === 0, errors: errors };
  }

  /* ---------- 生産配分と総生産量（仕様書5-1） ---------- */

  /** n財をほぼ均等に配分した整数%（例：3財→[34,33,33]） */
  function equalRow(n) {
    var base = Math.floor(100 / n), rest = 100 - base * n, row = [];
    for (var j = 0; j < n; j++) row.push(base + (j < rest ? 1 : 0));
    return row;
  }
  function equalShares(m, n) { var out = []; for (var i = 0; i < m; i++) out.push(equalRow(n)); return out; }

  /**
   * 1財の割合を変えたとき、残りの財を「今の比率のまま」縮小・拡大して合計100%に保つ。
   * 結果は0〜100の整数で、合計は必ず100。
   */
  function rebalanceRow(row, idx, value) {
    var n = row.length;
    value = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    if (n === 1) return [100];
    if (n === 2) { var r2 = [0, 0]; r2[idx] = value; r2[1 - idx] = 100 - value; return r2; }
    var restTotal = 100 - value;
    var others = [];
    var sumOthers = 0;
    for (var j = 0; j < n; j++) if (j !== idx) { others.push(j); sumOthers += Math.max(0, row[j]); }
    var raw = others.map(function (j) {
      return sumOthers > 0 ? restTotal * Math.max(0, row[j]) / sumOthers : restTotal / others.length;
    });
    // 最大剰余法で整数化
    var floors = raw.map(Math.floor);
    var left = restTotal - floors.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (v, k) { return { k: k, r: v - floors[k] }; })
      .sort(function (a, b) { return b.r - a.r || a.k - b.k; });
    for (var t = 0; t < left; t++) floors[order[t % order.length].k] += 1;
    var out = new Array(n);
    out[idx] = value;
    others.forEach(function (j, k) { out[j] = floors[k]; });
    return out;
  }

  /** 生産量を計算。shares は %（整数）。戻り値は Frac で厳密。 */
  function production(sc, shares) {
    var m = sc.producers.length, n = sc.goods.length;
    var per = [], total = [];
    for (var j = 0; j < n; j++) total.push(new Frac(0));
    for (var i = 0; i < m; i++) {
      var row = [];
      var L = Frac.from(sc.labor && sc.labor[i] !== undefined ? sc.labor[i] : 1);
      for (var k = 0; k < n; k++) {
        var s = shares[i][k];
        if (!(s >= 0 && s <= 100)) throw new Error('配分が0〜100%の範囲外です');
        var q = Frac.from(Number(sc.table[i][k])).mul(L).mul(new Frac(Math.round(s), 100));
        row.push(q);
        total[k] = total[k].add(q);
      }
      per.push(row);
    }
    return { perProducer: per, total: total };
  }

  /** 基準と現在の総生産量の差。{delta: Frac[], sign: -1|0|1[]} */
  function compareTotals(baseTotals, curTotals) {
    return baseTotals.map(function (b, j) {
      var d = curTotals[j].sub(b);
      return { base: b, cur: curTotals[j], delta: d, sign: d.cmp(0) };
    });
  }

  /* ---------- 機会費用・絶対優位・比較優位（仕様書5-2） ---------- */

  /** 生産者 i が財 x を1個増やすとき、あきらめる財 y の量 = a[i][y] / a[i][x] */
  function opportunityCost(table, i, x, y) {
    return Frac.from(Number(table[i][y])).div(Frac.from(Number(table[i][x])));
  }

  /**
   * 2生産者×2財の部分問題を分析する。
   * p, q：生産者の番号、x, y：財の番号
   * 戻り値：
   *   abs[g]  : 財 g（'x'|'y'）でより多く作れる生産者の番号。同じなら null
   *   oc[p][g]: 機会費用（Frac）
   *   comp[g] : 財 g に比較優位を持つ生産者の番号。機会費用が同じなら null
   *   tie     : 機会費用が等しく、比較優位に差がない
   */
  function analyzePair(table, p, q, x, y) {
    var ap = [Frac.from(Number(table[p][x])), Frac.from(Number(table[p][y]))];
    var aq = [Frac.from(Number(table[q][x])), Frac.from(Number(table[q][y]))];
    function better(c) { return c > 0 ? p : (c < 0 ? q : null); }
    var abs = { x: better(ap[0].cmp(aq[0])), y: better(ap[1].cmp(aq[1])) };
    var oc = {};
    oc[p] = { x: opportunityCost(table, p, x, y), y: opportunityCost(table, p, y, x) };
    oc[q] = { x: opportunityCost(table, q, x, y), y: opportunityCost(table, q, y, x) };
    // 機会費用が「小さい」方が比較優位
    var cx = oc[p].x.cmp(oc[q].x);
    var cy = oc[p].y.cmp(oc[q].y);
    var comp = { x: cx < 0 ? p : (cx > 0 ? q : null), y: cy < 0 ? p : (cy > 0 ? q : null) };
    var tie = comp.x === null;
    // 整合性チェック：2×2では、xの比較優位とyの比較優位は必ず別の生産者になる
    if (!tie && comp.x === comp.y) throw new Error('比較優位の判定が矛盾しています');
    if (tie !== (comp.y === null)) throw new Error('比較優位の判定が矛盾しています');
    var bothAbs = (abs.x !== null && abs.x === abs.y) ? abs.x : null;
    return { p: p, q: q, x: x, y: y, abs: abs, bothAbs: bothAbs, oc: oc, comp: comp, tie: tie };
  }

  /** 2×2で比較優位に従う完全分業の配分（%）。差がない場合は null */
  function specializationShares(sc, pair) {
    if (pair.tie) return null;
    var m = sc.producers.length, n = sc.goods.length;
    var shares = [];
    for (var i = 0; i < m; i++) { var r = []; for (var j = 0; j < n; j++) r.push(0); shares.push(r); }
    shares[pair.comp.x][pair.x] = 100;
    shares[pair.comp.y][pair.y] = 100;
    return shares;
  }

  var api = {
    LIMITS: LIMITS, PRESETS: PRESETS,
    defaultScenario: defaultScenario, defaultLabels: defaultLabels, defaultGoods: defaultGoods,
    cloneScenario: cloneScenario, resizeScenario: resizeScenario,
    parseCell: parseCell, toHalfWidth: toHalfWidth, validateScenario: validateScenario,
    equalRow: equalRow, equalShares: equalShares, rebalanceRow: rebalanceRow,
    production: production, compareTotals: compareTotals,
    opportunityCost: opportunityCost, analyzePair: analyzePair, specializationShares: specializationShares
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.TS = root.TS || {}; root.TS.model = api; }
})(typeof window !== 'undefined' ? window : this);
