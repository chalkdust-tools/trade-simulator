/*
 * problems.js — 問題バンク（第1段階：2×2、P01〜P05）
 *
 * 方針（仕様書7章）
 *  - 典型問題のテンプレートに、数値だけを安全にランダムで入れる。
 *  - 生成した問題は、テンプレートとは別の素朴な計算（solve）で正解を再計算し、
 *    食い違い・選択肢の重複・正解が複数などがあれば破棄して作り直す。
 *  - 同じ seed からは同じ問題ができる（印刷・再表示用）。
 */
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Frac = isNode ? require('./fraction.js') : root.TS.Frac;
  var M = isNode ? require('./model.js') : root.TS.model;

  /* ---------- 乱数（再現可能） ---------- */
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mixSeed(seed, k) {
    var h = (Number(seed) >>> 0) ^ Math.imul((k + 1) >>> 0, 0x9E3779B1);
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function newSeed() { return Math.floor(Math.random() * 900000) + 100000; }

  /* ---------- 定義 ---------- */
  var CATEGORIES = {
    P01: { name: '絶対優位', goal: '表から「同じ時間でより多く作れる」のはどちらかを読み取る' },
    P02: { name: '比較優位', goal: '機会費用を比べて、比較優位を判定する' },
    P03: { name: '機会費用', goal: '1個つくるときに、あきらめる量を計算する' },
    P04: { name: '生産配分', goal: '配分を変えたときの合計生産量を計算する' },
    P05: { name: 'よくある誤解', goal: '「両方得意なら分業は不要」などの誤解を見分ける' }
  };
  var DIFFICULTIES = { intro: '入門', standard: '標準' };

  // 表の単位は「個」なので、「個」で数えて自然な商品だけを使う
  var GOOD_PAIRS = [['商品A', '商品B'], ['パン', 'ケーキ'], ['りんご', 'みかん'], ['ボール', 'ぼうし'], ['時計', 'バッグ'], ['いす', 'つくえ']];

  /* ---------- 2×2の表を作る ---------- */
  /**
   * opts.requireNoTie：機会費用が同じ表を避ける
   * opts.requireBothAbs：一方が両方の財で絶対優位を持つ表にする
   * opts.distinctColumns：同じ財で同じ生産量を避ける
   */
  function genScenario(rng, difficulty, opts) {
    opts = opts || {};
    var hi = difficulty === 'intro' ? 10 : 12;
    for (var tries = 0; tries < 500; tries++) {
      var t = [[randInt(rng, 2, hi), randInt(rng, 2, hi)], [randInt(rng, 2, hi), randInt(rng, 2, hi)]];
      if (difficulty === 'intro') {
        // 入門：比が分かりやすいよう、片方の値がもう片方の約数になる行を優先
        if (!(t[0][0] % t[0][1] === 0 || t[0][1] % t[0][0] === 0)) continue;
      }
      if (opts.distinctColumns !== false && (t[0][0] === t[1][0] || t[0][1] === t[1][1])) continue;
      var tie = t[0][0] * t[1][1] === t[0][1] * t[1][0];
      if (opts.requireNoTie !== false && tie) continue;
      var bothAbs = (t[0][0] > t[1][0] && t[0][1] > t[1][1]) || (t[0][0] < t[1][0] && t[0][1] < t[1][1]);
      if (opts.requireBothAbs && !bothAbs) continue;
      var kind = rng() < 0.5 ? 'people' : 'countries';
      var goods = kind === 'people' ? ['商品A', '商品B'] : pick(rng, GOOD_PAIRS).slice();
      return { producers: M.defaultLabels(kind, 2), goods: goods, table: t, labor: [1, 1], kind: kind };
    }
    return null;
  }

  function fmt(f) { return Frac.from(f).toDisplay(); }

  /* ---------- 素朴な検算（テンプレートと別ルート） ---------- */
  var naive = {
    more: function (t, x) { return t[0][x] > t[1][x] ? 0 : (t[0][x] < t[1][x] ? 1 : -1); },
    both: function (t) {
      if (t[0][0] > t[1][0] && t[0][1] > t[1][1]) return 0;
      if (t[0][0] < t[1][0] && t[0][1] < t[1][1]) return 1;
      return -1;
    },
    // xに比較優位を持つ生産者（機会費用 t[i][y]/t[i][x] が小さい方）。差なし -1
    comp: function (t, x) {
      var y = 1 - x;
      var l = t[0][y] * t[1][x], r = t[1][y] * t[0][x]; // oc0 < oc1 ⇔ t0y/t0x < t1y/t1x ⇔ t0y*t1x < t1y*t0x
      return l < r ? 0 : (l > r ? 1 : -1);
    },
    oc: function (t, p, x) { return t[p][1 - x] / t[p][x]; },
    total: function (t, sharesX, x) { // sharesX[i] = 財0に使う%（整数）
      var s = 0;
      for (var i = 0; i < 2; i++) { var share = x === 0 ? sharesX[i] : 100 - sharesX[i]; s += t[i][x] * share / 100; }
      return s;
    }
  };

  /* ---------- テンプレート ---------- */
  function L(sc) { return { P: sc.producers, G: sc.goods, t: sc.table }; }

  var TEMPLATES = [];
  function def(t) { TEMPLATES.push(t); }

  // P01-1：どちらが多く作れるか
  def({
    id: 'P01-more', category: 'P01', levels: ['intro', 'standard'], format: 'choice', minutes: 1,
    terms: ['絶対優位'],
    make: function (rng, sc) {
      var o = L(sc), x = randInt(rng, 0, 1);
      var a = o.t[0][x], b = o.t[1][x];
      var choices = [o.P[0], o.P[1], 'どちらも同じ'];
      var ans = a > b ? 0 : (a < b ? 1 : 2);
      var win = ans === 2 ? null : o.P[ans];
      return {
        params: { x: x },
        prompt: '表を見てください。' + o.G[x] + 'を、同じ時間でより多く作れるのはどちらですか。',
        choices: choices, answerIndex: ans,
        steps: [o.G[x] + 'の列だけを見る：' + o.P[0] + ' ' + a + '個、' + o.P[1] + ' ' + b + '個',
          win ? (Math.max(a, b) + ' ＞ ' + Math.min(a, b) + ' なので、' + win + 'の方が多い') : '同じ数なので差はない'],
        hints: [o.G[x] + 'の列（たての並び）だけを見て、2つの数を比べよう。',
          o.P[0] + 'は' + a + '個、' + o.P[1] + 'は' + b + '個つくれます。',
          '同じ時間で多く作れる方が、その商品の「絶対優位」を持ちます。'],
        explanation: win
          ? o.P[0] + 'は' + a + '個、' + o.P[1] + 'は' + b + '個なので、' + win + 'の方が多く作れます。これを「' + o.G[x] + 'について、' + win + 'が絶対優位を持つ」といいます。'
          : '2人とも' + a + '個で同じです。この商品については絶対優位に差がありません。',
        reason: win ? win + 'の方が ' + o.G[x] + ' を多く作れます（' + Math.max(a, b) + '個 ＞ ' + Math.min(a, b) + '個）。' : '同じ数なので差はありません。'
      };
    },
    solve: function (p) { var r = naive.more(p.scenario.table, p.params.x); return r === -1 ? 2 : r; }
  });

  // P01-2：両方の財で絶対優位を持つのは
  def({
    id: 'P01-both', category: 'P01', levels: ['intro', 'standard'], format: 'choice', minutes: 1,
    terms: ['絶対優位'],
    make: function (rng, sc) {
      var o = L(sc), t = o.t;
      var ans = naive.both(t); // 検算とは別に model で判定
      var pair = M.analyzePair(t, 0, 1, 0, 1);
      var idx = pair.bothAbs === null ? 2 : pair.bothAbs;
      var line = function (j) { return o.G[j] + '：' + o.P[0] + ' ' + t[0][j] + '個／' + o.P[1] + ' ' + t[1][j] + '個'; };
      // 商品ごとの結果を、表の数どおりに説明する（同じ数の商品があれば「同じ」と書く）
      var judge = function (j) {
        var w = pair.abs[j === 0 ? 'x' : 'y'];
        return w === null ? o.G[j] + 'は同じ数で差がない' : o.G[j] + 'は' + o.P[w] + 'が多い';
      };
      var why = judge(0) + '、' + judge(1);
      return {
        params: {},
        prompt: '商品を1つずつ比べたとき、両方の商品で絶対優位を持つ（どちらの商品も多く作れる）のはどちらですか。',
        choices: [o.P[0], o.P[1], 'どちらでもない（両方の商品で多く作れる人・国はいない）'], answerIndex: idx,
        steps: [line(0), line(1), idx === 2 ? why : o.P[idx] + 'が両方で多い'],
        hints: ['まず' + o.G[0] + 'だけ、次に' + o.G[1] + 'だけを比べよう。',
          line(0) + '、' + line(1),
          '両方とも同じ人（国）が多ければ、その人（国）が両方で絶対優位です。'],
        explanation: (idx === 2
          ? line(0) + '、' + line(1) + '。' + why + 'ので、両方の商品で絶対優位を持つ人（国）はいません。'
          : line(0) + '、' + line(1) + '。どちらも' + o.P[idx] + 'の方が多いので、' + o.P[idx] + 'が両方の商品で絶対優位を持ちます。ただし、これだけでは「比較優位」は決まりません。'),
        reason: idx === 2 ? why + 'からです。' : o.P[idx] + 'はどちらの商品も多く作れます。'
      };
    },
    solve: function (p) { var r = naive.both(p.scenario.table); return r === -1 ? 2 : r; }
  });

  function ocLines(o, x) {
    var y = 1 - x;
    return [0, 1].map(function (i) {
      return o.P[i] + '：' + o.G[x] + '1個あたり ' + o.G[y] + ' ' + o.t[i][y] + '÷' + o.t[i][x] + '＝' + fmt(new Frac(o.t[i][y], o.t[i][x])) + '個';
    });
  }

  // P02-1：財xに比較優位を持つのは
  def({
    id: 'P02-who', category: 'P02', levels: ['intro', 'standard'], format: 'choice', minutes: 2,
    terms: ['比較優位', '機会費用'],
    make: function (rng, sc) {
      var o = L(sc), x = randInt(rng, 0, 1), y = 1 - x;
      var pair = M.analyzePair(o.t, 0, 1, x, y);
      var idx = pair.tie ? 2 : pair.comp.x;
      var lines = ocLines(o, x);
      return {
        params: { x: x },
        prompt: o.G[x] + 'に比較優位を持つのはどちらですか。',
        choices: [o.P[0], o.P[1], '比較優位に差はない'], answerIndex: idx,
        steps: ['機会費用＝' + o.G[x] + 'を1個つくるとき、あきらめる' + o.G[y] + 'の量'].concat(lines)
          .concat([pair.tie ? '機会費用が同じなので差はない' : '機会費用が小さい ' + o.P[idx] + ' が比較優位']),
        hints: ['「多く作れるか」ではなく、「' + o.G[x] + 'を1個つくるとき、' + o.G[y] + 'を何個あきらめるか」を比べよう。',
          '機会費用 ＝ ' + o.G[y] + 'の生産量 ÷ ' + o.G[x] + 'の生産量',
          lines.join('、')],
        explanation: lines.join('。') + '。' + (pair.tie
          ? '機会費用が同じなので、比較優位に差はありません。'
          : '機会費用（あきらめる量）が小さいのは' + o.P[idx] + 'なので、' + o.G[x] + 'の比較優位は' + o.P[idx] + 'にあります。'
            + (pair.abs.x !== null && pair.abs.x !== idx ? '（' + o.G[x] + 'を多く作れるのは' + o.P[pair.abs.x] + 'ですが、比較優位とは別です。）' : '')),
        reason: pair.tie ? '機会費用が同じです。' : o.P[idx] + 'の方が、' + o.G[x] + '1個あたりにあきらめる' + o.G[y] + 'が少ないからです。'
      };
    },
    solve: function (p) { var r = naive.comp(p.scenario.table, p.params.x); return r === -1 ? 2 : r; }
  });

  // P02-2：生産者pが比較優位を持つのはどちらの財
  def({
    id: 'P02-which', category: 'P02', levels: ['intro', 'standard'], format: 'choice', minutes: 2,
    terms: ['比較優位', '機会費用'],
    make: function (rng, sc) {
      var o = L(sc), p = randInt(rng, 0, 1);
      var pair = M.analyzePair(o.t, 0, 1, 0, 1);
      var idx = pair.tie ? 2 : (pair.comp.x === p ? 0 : 1);
      var lines = ocLines(o, 0);
      return {
        params: { p: p },
        prompt: o.P[p] + 'が比較優位を持つのは、どちらの商品ですか。',
        choices: [o.G[0], o.G[1], 'どちらでもない（差がない）'], answerIndex: idx,
        steps: [o.G[0] + 'の機会費用を2人で比べる'].concat(lines)
          .concat([pair.tie ? '同じなので差はない' : o.G[0] + 'は' + o.P[pair.comp.x] + '、' + o.G[1] + 'は' + o.P[pair.comp.y] + 'が比較優位']),
        hints: ['まず' + o.G[0] + 'を1個つくるとき、' + o.G[1] + 'を何個あきらめるかを2人分くらべよう。',
          lines.join('、'),
          'あきらめる量が小さい方がその商品に比較優位。もう一方は、もう一つの商品に比較優位を持ちます。'],
        explanation: lines.join('。') + '。' + (pair.tie
          ? '機会費用が同じなので、どちらの商品にも比較優位の差はありません。'
          : o.G[0] + 'の比較優位は' + o.P[pair.comp.x] + '、' + o.G[1] + 'の比較優位は' + o.P[pair.comp.y] + 'にあります。したがって' + o.P[p] + 'は' + o.G[idx] + 'に比較優位を持ちます。'),
        reason: pair.tie ? '機会費用が同じです。' : o.P[p] + 'は' + o.G[idx] + 'をつくるときにあきらめる量が、相手より少ないからです。'
      };
    },
    solve: function (p) {
      var r = naive.comp(p.scenario.table, 0);
      if (r === -1) return 2;
      return r === p.params.p ? 0 : 1;
    }
  });

  // P03（標準）：機会費用を数値で
  def({
    id: 'P03-oc', category: 'P03', levels: ['standard'], format: 'number', minutes: 2,
    terms: ['機会費用'],
    make: function (rng, sc) {
      var o = L(sc), p = randInt(rng, 0, 1), x = randInt(rng, 0, 1), y = 1 - x;
      var ans = M.opportunityCost(o.t, p, x, y);
      return {
        params: { p: p, x: x },
        prompt: o.P[p] + 'が' + o.G[x] + 'を1個つくるとき、あきらめる' + o.G[y] + 'は何個分ですか。' +
          (ans.toNumber() >= 0.1 ? '（分数でも、小数第2位まででもかまいません）' : '（答えがとても小さいので、分数で答えよう）'),
        answer: ans, unit: '個',
        steps: [o.P[p] + 'は同じ時間で ' + o.G[x] + ' ' + o.t[p][x] + '個、または ' + o.G[y] + ' ' + o.t[p][y] + '個つくれる',
          o.G[x] + ' ' + o.t[p][x] + '個 と ' + o.G[y] + ' ' + o.t[p][y] + '個 が「同じ重さ」',
          o.G[x] + '1個あたり：' + o.t[p][y] + ' ÷ ' + o.t[p][x] + ' ＝ ' + fmt(ans) + '個'],
        hints: ['表の' + o.P[p] + 'の行だけを見よう。' + o.G[x] + 'を' + o.t[p][x] + '個つくる時間で、' + o.G[y] + 'なら何個つくれる？',
          o.G[x] + ' ' + o.t[p][x] + '個 ⇔ ' + o.G[y] + ' ' + o.t[p][y] + '個。1個あたりにするには、' + o.t[p][x] + 'で割ります。',
          o.t[p][y] + ' ÷ ' + o.t[p][x] + ' を計算しよう。'],
        explanation: o.P[p] + 'は同じ時間で' + o.G[x] + 'を' + o.t[p][x] + '個、または' + o.G[y] + 'を' + o.t[p][y] + '個つくれます。'
          + o.G[x] + 'を1個ふやすと、' + o.G[y] + 'を ' + o.t[p][y] + '÷' + o.t[p][x] + '＝' + fmt(ans) + '個 あきらめることになります。これが機会費用です。',
        reason: o.t[p][y] + '÷' + o.t[p][x] + '＝' + fmt(ans) + '個です。'
      };
    },
    solve: function (p) { return naive.oc(p.scenario.table, p.params.p, p.params.x); }
  });

  // P03（入門）：機会費用を選択式で
  def({
    id: 'P03-oc-choice', category: 'P03', levels: ['intro'], format: 'choice', minutes: 2,
    terms: ['機会費用'],
    make: function (rng, sc) {
      var o = L(sc), p = randInt(rng, 0, 1), x = randInt(rng, 0, 1), y = 1 - x;
      var ans = M.opportunityCost(o.t, p, x, y);
      var inv = M.opportunityCost(o.t, p, y, x);
      var cands = [ans, inv, Frac.from(o.t[p][y]), Frac.from(o.t[p][x])];
      // 重複を除いた選択肢（正解が1つだけになるように）
      var uniq = [];
      cands.forEach(function (c) { if (!uniq.some(function (u) { return u.eq(c); })) uniq.push(c); });
      if (uniq.length < 3) return null;
      var order = shuffle(rng, uniq.slice(0, 4));
      var idx = order.findIndex(function (c) { return c.eq(ans); });
      return {
        params: { p: p, x: x, opts: order.map(function (c) { return c.toFracString(); }) },
        prompt: o.P[p] + 'が' + o.G[x] + 'を1個つくると、' + o.G[y] + 'を何個あきらめることになりますか。',
        choices: order.map(function (c) { return fmt(c) + '個'; }), answerIndex: idx,
        steps: [o.G[x] + ' ' + o.t[p][x] + '個 ⇔ ' + o.G[y] + ' ' + o.t[p][y] + '個（同じ時間）',
          o.G[x] + '1個あたり：' + o.t[p][y] + '÷' + o.t[p][x] + '＝' + fmt(ans) + '個'],
        hints: ['表の' + o.P[p] + 'の行だけを見よう。',
          o.G[x] + 'を' + o.t[p][x] + '個つくる時間で、' + o.G[y] + 'なら' + o.t[p][y] + '個つくれます。',
          '1個あたりにするには、' + o.t[p][y] + 'を' + o.t[p][x] + 'で割ります。'],
        explanation: o.P[p] + 'は同じ時間で' + o.G[x] + 'を' + o.t[p][x] + '個、または' + o.G[y] + 'を' + o.t[p][y] + '個つくれます。'
          + o.G[x] + '1個あたりでは ' + o.t[p][y] + '÷' + o.t[p][x] + '＝' + fmt(ans) + '個 の' + o.G[y] + 'をあきらめます（機会費用）。',
        reason: o.t[p][y] + '÷' + o.t[p][x] + '＝' + fmt(ans) + '個です。'
      };
    },
    solve: function (p) {
      var v = naive.oc(p.scenario.table, p.params.p, p.params.x);
      var hits = p.params.opts.map(function (s, k) { var f = s.split('/'); var n = Number(f[0]) / Number(f[1] || 1); return Math.abs(n - v) < 1e-9 ? k : -1; })
        .filter(function (k) { return k >= 0; });
      return hits.length === 1 ? hits[0] : -99;
    }
  });

  var SHARE_CHOICES = [10, 20, 25, 30, 40, 60, 70, 75, 80, 90];

  // P04-1（標準）：配分を指定して合計を計算
  def({
    id: 'P04-mix', category: 'P04', levels: ['standard'], format: 'number', minutes: 3,
    terms: ['分業'],
    make: function (rng, sc) {
      var o = L(sc), x = randInt(rng, 0, 1);
      var s0 = pick(rng, SHARE_CHOICES), s1 = pick(rng, SHARE_CHOICES);
      var shares = [[s0, 100 - s0], [s1, 100 - s1]];
      var prod = M.production(sc, shares);
      var ans = prod.total[x];
      var part = function (i) { return o.t[i][x] + '×' + shares[i][x] + '%＝' + fmt(prod.perProducer[i][x]); };
      return {
        params: { x: x, sharesX: [s0, s1] },
        prompt: o.P[0] + 'は時間の' + s0 + '%を' + o.G[0] + 'に（残り' + (100 - s0) + '%は' + o.G[1] + 'に）、'
          + o.P[1] + 'は時間の' + s1 + '%を' + o.G[0] + 'に（残り' + (100 - s1) + '%は' + o.G[1] + 'に）使います。'
          + '2人（2国）合わせた' + o.G[x] + 'の生産量は何個ですか。',
        answer: ans, unit: '個',
        steps: [o.P[0] + '：' + part(0), o.P[1] + '：' + part(1), '合計：' + fmt(prod.perProducer[0][x]) + '＋' + fmt(prod.perProducer[1][x]) + '＝' + fmt(ans) + '個'],
        hints: [o.G[x] + 'に使う割合を、1人（1国）ずつ確認しよう。',
          '1人分の生産量 ＝ 表の数 × ' + o.G[x] + 'に使う割合。たとえば ' + o.P[0] + ' は ' + o.t[0][x] + '×' + shares[0][x] + '%。',
          '2人分を計算して、たし算します。'],
        explanation: o.P[0] + 'は ' + part(0) + '個、' + o.P[1] + 'は ' + part(1) + '個。合計 ' + fmt(ans) + '個です。',
        reason: fmt(prod.perProducer[0][x]) + '＋' + fmt(prod.perProducer[1][x]) + '＝' + fmt(ans) + '個です。'
      };
    },
    solve: function (p) { return naive.total(p.scenario.table, p.params.sharesX, p.params.x); }
  });

  // P04-2（標準）：完全分業したときの合計
  def({
    id: 'P04-spec', category: 'P04', levels: ['standard'], format: 'number', minutes: 2,
    terms: ['分業', '比較優位'],
    needsNoTie: true,
    make: function (rng, sc) {
      var o = L(sc), x = randInt(rng, 0, 1);
      var pair = M.analyzePair(o.t, 0, 1, 0, 1);
      if (pair.tie) return null;
      var sh = M.specializationShares(sc, pair);
      var prod = M.production(sc, sh);
      var ans = prod.total[x];
      var who = function (j) { return o.P[pair.comp[j === 0 ? 'x' : 'y']]; };
      return {
        params: { x: x },
        prompt: '比較優位にしたがって完全に分業します（' + who(0) + 'は' + o.G[0] + 'だけ、' + who(1) + 'は' + o.G[1] + 'だけをつくる）。'
          + o.G[x] + 'の合計生産量は何個ですか。',
        answer: ans, unit: '個',
        steps: [o.G[x] + 'をつくるのは ' + who(x) + ' だけ', who(x) + 'は時間の100%を' + o.G[x] + 'に使う → ' + fmt(ans) + '個'],
        hints: ['完全分業では、' + o.G[x] + 'をつくるのは1人（1国）だけです。',
          o.G[x] + 'をつくるのは' + who(x) + 'です。',
          who(x) + 'が時間をすべて使うので、表の数がそのまま生産量になります。'],
        explanation: o.G[x] + 'をつくるのは' + who(x) + 'だけで、時間の100%を使うので' + fmt(ans) + '個です。'
          + '（分業前の配分と比べて、ある商品はふえ、別の商品はへることもあります。）',
        reason: who(x) + 'だけが' + o.G[x] + 'を' + fmt(ans) + '個つくります。'
      };
    },
    solve: function (p) {
      var t = p.scenario.table, x = p.params.x;
      var c = naive.comp(t, x); // x に比較優位を持つ人が x を全量
      return c === -1 ? NaN : t[c][x];
    }
  });

  // P04-2（入門）：50%ずつと比べて、完全分業でどうなる？
  def({
    id: 'P04-spec-choice', category: 'P04', levels: ['intro'], format: 'choice', minutes: 2,
    terms: ['分業', '比較優位'],
    make: function (rng, sc) {
      var o = L(sc), x = randInt(rng, 0, 1);
      var pair = M.analyzePair(o.t, 0, 1, 0, 1);
      if (pair.tie) return null;
      var base = M.production(sc, M.equalShares(2, 2)).total[x];
      var spec = M.production(sc, M.specializationShares(sc, pair)).total[x];
      var c = spec.cmp(base);
      var idx = c > 0 ? 0 : (c < 0 ? 1 : 2);
      var who = o.P[pair.comp[x === 0 ? 'x' : 'y']];
      return {
        params: { x: x },
        prompt: '2人（2国）とも時間を50%ずつ使う場合と比べます。比較優位にしたがって完全に分業すると、' + o.G[x] + 'の合計はどうなりますか。',
        choices: ['ふえる', 'へる', '変わらない'], answerIndex: idx,
        steps: ['50%ずつ：' + o.t[0][x] + '×50%＋' + o.t[1][x] + '×50%＝' + fmt(base) + '個',
          '完全分業：' + o.G[x] + 'は' + who + 'だけ → ' + fmt(spec) + '個',
          fmt(base) + '個 → ' + fmt(spec) + '個'],
        hints: ['まず、50%ずつのときの' + o.G[x] + 'の合計を出そう（表の数の半分をたす）。',
          '50%ずつ：' + o.t[0][x] + '÷2＋' + o.t[1][x] + '÷2＝' + fmt(base) + '個',
          '完全分業では、' + o.G[x] + 'をつくるのは' + who + 'だけ（' + fmt(spec) + '個）です。'],
        explanation: '50%ずつのとき' + o.G[x] + 'は' + fmt(base) + '個、完全分業では' + fmt(spec) + '個なので「' + ['ふえる', 'へる', '変わらない'][idx] + '」です。'
          + '完全分業でいつも両方の商品がふえるとはかぎりません。どの配分がよいかは、何を基準に比べるかで変わります。',
        reason: fmt(base) + '個 → ' + fmt(spec) + '個 です。'
      };
    },
    solve: function (p) {
      var t = p.scenario.table, x = p.params.x;
      var c = naive.comp(t, x);
      if (c === -1) return -99;
      var base = (t[0][x] + t[1][x]) / 2, spec = t[c][x];
      return spec > base + 1e-9 ? 0 : (spec < base - 1e-9 ? 1 : 2);
    }
  });

  /** 50%ずつより両方の合計を増やせる配分（1%刻み）を1つ探す。なければ null */
  function findBothIncrease(sc) {
    var base = M.production(sc, M.equalShares(2, 2)).total;
    var best = null;
    for (var a = 0; a <= 100; a += 5) {
      for (var b = 0; b <= 100; b += 5) {
        var tot = M.production(sc, [[a, 100 - a], [b, 100 - b]]).total;
        if (tot[0].cmp(base[0]) > 0 && tot[1].cmp(base[1]) > 0) {
          var gain = tot[0].sub(base[0]).add(tot[1].sub(base[1])).toNumber();
          if (!best || gain > best.gain) best = { shares: [[a, 100 - a], [b, 100 - b]], totals: tot, gain: gain };
        }
      }
    }
    return best;
  }

  // P05：よくある誤解（正誤）
  def({
    id: 'P05-noneed', category: 'P05', levels: ['intro', 'standard'], format: 'choice', minutes: 2,
    terms: ['比較優位', '絶対優位'], needsBothAbs: true,
    make: function (rng, sc) {
      var o = L(sc);
      var pair = M.analyzePair(o.t, 0, 1, 0, 1);
      if (pair.bothAbs === null || pair.tie) return null;
      var ex = findBothIncrease(sc);
      if (!ex) return null;
      var w = o.P[pair.bothAbs];
      var base = M.production(sc, M.equalShares(2, 2)).total;
      return {
        params: {},
        prompt: '正しいか、誤りか。「' + w + 'のように、両方の商品を多く作れる人（国）は、相手と分業しても意味がない。」',
        choices: ['正しい', '誤り'], answerIndex: 1,
        steps: ['両方多く作れる＝両方で絶対優位', '比較優位：' + o.G[0] + 'は' + o.P[pair.comp.x] + '、' + o.G[1] + 'は' + o.P[pair.comp.y],
          '例：' + o.P[0] + 'が' + o.G[0] + 'に' + ex.shares[0][0] + '%、' + o.P[1] + 'が' + o.G[0] + 'に' + ex.shares[1][0] + '%使うと、合計 '
          + o.G[0] + ' ' + fmt(base[0]) + '→' + fmt(ex.totals[0]) + '個、' + o.G[1] + ' ' + fmt(base[1]) + '→' + fmt(ex.totals[1]) + '個'],
        hints: ['「多く作れる（絶対優位）」と「比較優位」は別のものです。', '機会費用を比べると、' + w + 'にも相手にも比較優位のある商品があります。', '生産の配分を変えると、合計がどうなるか考えよう。'],
        explanation: '誤りです。' + w + 'は両方の商品で絶対優位を持ちますが、機会費用を比べると' + o.G[0] + 'は' + o.P[pair.comp.x] + '、'
          + o.G[1] + 'は' + o.P[pair.comp.y] + 'に比較優位があります。たとえば' + o.P[0] + 'が' + o.G[0] + 'に' + ex.shares[0][0] + '%、'
          + o.P[1] + 'が' + ex.shares[1][0] + '%使うと、50%ずつの場合より両方の合計がふえます（' + o.G[0] + ' ' + fmt(base[0]) + '→' + fmt(ex.totals[0])
          + '個、' + o.G[1] + ' ' + fmt(base[1]) + '→' + fmt(ex.totals[1]) + '個）。ただし、交換したあと両者が得をするかは交換の条件しだいです。',
        reason: '両方で絶対優位でも、比較優位にそって分担すると合計をふやせる配分があります。'
      };
    },
    solve: function () { return 1; }
  });

  def({
    id: 'P05-always', category: 'P05', levels: ['intro', 'standard'], format: 'choice', minutes: 2,
    terms: ['分業'],
    make: function (rng, sc) {
      var o = L(sc);
      var pair = M.analyzePair(o.t, 0, 1, 0, 1);
      if (pair.tie) return null;
      var base = M.production(sc, M.equalShares(2, 2)).total;
      var spec = M.production(sc, M.specializationShares(sc, pair)).total;
      var desc = function (j) { var c = spec[j].cmp(base[j]); return o.G[j] + ' ' + fmt(base[j]) + '→' + fmt(spec[j]) + '個（' + (c > 0 ? 'ふえた' : (c < 0 ? 'へった' : '同じ')) + '）'; };
      var bothUp = spec[0].cmp(base[0]) > 0 && spec[1].cmp(base[1]) > 0;
      return {
        params: {},
        prompt: '正しいか、誤りか。「比較優位にしたがって完全に分業すれば、どんな表でも、両方の商品の合計がかならずふえる。」',
        choices: ['正しい', '誤り'], answerIndex: 1,
        steps: ['50%ずつと完全分業を比べる（この表の場合）', desc(0), desc(1)],
        hints: ['「どんな表でも」「かならず」に注目しよう。', 'この表で、50%ずつと完全分業を比べてみよう。', 'ふえる商品とへる商品があるかもしれません。'],
        explanation: '誤りです。完全分業で、ある商品がふえて別の商品がへることもあります。この表では 50%ずつと比べて、' + desc(0) + '、' + desc(1) + '。'
          + (bothUp ? 'この表ではたまたま両方ふえましたが、表によってはへる商品も出ます（例：Aさん10・5、Bさん6・4 では商品Bが4.5個→4個にへる）。'
            : '') + 'どの配分がよいかは、何を基準に比べるかで変わります。',
        reason: '完全分業で、へる商品が出ることもあります。'
      };
    },
    solve: function () { return 1; }
  });

  def({
    id: 'P05-def', category: 'P05', levels: ['intro', 'standard'], format: 'choice', minutes: 1,
    terms: ['比較優位', '絶対優位'],
    make: function (rng, sc) {
      var o = L(sc);
      var pair = M.analyzePair(o.t, 0, 1, 0, 1);
      var lines = ocLines(o, 0);
      return {
        params: {},
        prompt: '正しいか、誤りか。「比較優位とは、相手より多く作れることである。」',
        choices: ['正しい', '誤り'], answerIndex: 1,
        steps: ['相手より多く作れる → 絶対優位', '機会費用（あきらめる量）が小さい → 比較優位'],
        hints: ['「多く作れる」ことには別の名前があります。', '比較優位は、あきらめる量（機会費用）で比べます。', lines.join('、')],
        explanation: '誤りです。相手より多く作れることは「絶対優位」です。比較優位は、その商品をつくるときにあきらめる量（機会費用）が相手より小さいことです。'
          + (pair.bothAbs !== null && !pair.tie ? 'この表でも、' + o.P[pair.bothAbs] + 'は両方多く作れますが、比較優位は' + o.G[0] + 'が' + o.P[pair.comp.x] + '、' + o.G[1] + 'が' + o.P[pair.comp.y] + 'です。' : ''),
        reason: '多く作れるのは「絶対優位」。比較優位は機会費用で比べます。'
      };
    },
    solve: function () { return 1; }
  });

  def({
    id: 'P05-small', category: 'P05', levels: ['intro', 'standard'], format: 'choice', minutes: 1,
    terms: ['比較優位', '機会費用'],
    make: function (rng, sc) {
      return {
        params: {},
        prompt: '正しいか、誤りか。「ある商品の機会費用が相手より小さい人（国）は、その商品に比較優位を持つ。」',
        choices: ['正しい', '誤り'], answerIndex: 0,
        steps: ['機会費用＝その商品を1個つくるとき、あきらめる別の商品の量', '小さい＝相対的に得意 → 比較優位'],
        hints: ['機会費用は「あきらめる量」です。', 'あきらめる量が少ないのは、得意だからです。', '比較優位の定義を思い出そう。'],
        explanation: '正しいです。機会費用（1個つくるときにあきらめる量）が相手より小さいことが、比較優位を持つということです。多く作れるかどうか（絶対優位）とは別に判定します。',
        reason: '機会費用が小さい＝比較優位、です。'
      };
    },
    solve: function () { return 0; }
  });

  var BY_ID = {};
  TEMPLATES.forEach(function (t) { BY_ID[t.id] = t; });

  /* ---------- 生成と検証 ---------- */

  function fixedScenarioUsable(sc) {
    return sc && sc.producers && sc.producers.length === 2 && sc.goods.length === 2 && M.validateScenario(sc).ok;
  }

  /**
   * 1問つくる。spec = {templateId, seed, difficulty, fixed?(2×2シナリオ)}
   * 検算に通らない場合は乱数を進めて作り直す。最後まで駄目なら null。
   */
  function buildProblem(spec) {
    var tpl = BY_ID[spec.templateId];
    if (!tpl) return null;
    var rng = mulberry32(spec.seed);
    for (var tries = 0; tries < 60; tries++) {
      var sc;
      if (spec.fixed) {
        sc = { producers: spec.fixed.producers.slice(), goods: spec.fixed.goods.slice(), table: spec.fixed.table.map(function (r) { return r.map(Number); }), labor: [1, 1] };
      } else {
        sc = genScenario(rng, spec.difficulty, {
          requireNoTie: true,
          requireBothAbs: !!tpl.needsBothAbs || rng() < 0.5
        });
      }
      if (!sc) continue;
      var made = tpl.make(rng, sc);
      if (!made) { if (spec.fixed && tries > 10) return null; continue; }
      var prob = {
        uid: spec.templateId + '-' + spec.seed,
        templateId: tpl.id, category: tpl.category, categoryName: CATEGORIES[tpl.category].name,
        objective: CATEGORIES[tpl.category].goal,
        difficulty: spec.difficulty, seed: spec.seed, minutes: tpl.minutes, format: tpl.format, terms: tpl.terms,
        scenario: sc, size: '2×2'
      };
      for (var k in made) prob[k] = made[k];
      var check = verifyProblem(prob);
      if (check.ok) return prob;
      if (typeof console !== 'undefined' && root.TS_DEBUG) console.warn('問題を破棄:', check.reason, prob);
    }
    return null;
  }

  /** 正答・選択肢・途中式の整合性をチェック */
  function verifyProblem(p) {
    var tpl = BY_ID[p.templateId];
    if (!tpl) return { ok: false, reason: 'テンプレートなし' };
    if (!M.validateScenario(p.scenario).ok) return { ok: false, reason: '表が不正' };
    if (!p.prompt || !p.explanation || !p.hints || p.hints.length !== 3 || !p.steps || !p.steps.length) return { ok: false, reason: '文面が不足' };
    var expected = tpl.solve(p);
    if (p.format === 'choice') {
      if (!Array.isArray(p.choices) || p.choices.length < 2) return { ok: false, reason: '選択肢が不足' };
      var set = {};
      for (var i = 0; i < p.choices.length; i++) { if (set[p.choices[i]]) return { ok: false, reason: '選択肢が重複' }; set[p.choices[i]] = 1; }
      if (!(p.answerIndex >= 0 && p.answerIndex < p.choices.length)) return { ok: false, reason: '正解番号が範囲外' };
      if (expected !== p.answerIndex) return { ok: false, reason: '検算と正解が不一致 (' + expected + ' vs ' + p.answerIndex + ')' };
    } else if (p.format === 'number') {
      if (!(p.answer instanceof Frac)) return { ok: false, reason: '正解が分数でない' };
      var v = p.answer.toNumber();
      if (!isFinite(v) || v <= 0) return { ok: false, reason: '正解が正の有限数でない' };
      if (!(typeof expected === 'number' && Math.abs(expected - v) < 1e-9)) return { ok: false, reason: '検算と正解が不一致 (' + expected + ' vs ' + v + ')' };
      // 解説・途中式に正解の表示が含まれていること
      var disp = p.answer.toDisplay();
      if (p.explanation.indexOf(disp) < 0 || p.steps.join('').indexOf(disp) < 0) return { ok: false, reason: '解説に正解が含まれない' };
    } else return { ok: false, reason: '形式が不明' };
    return { ok: true };
  }

  /** テンプレートの選び方：カテゴリーを順番に回し、カテゴリー内はテンプレートを循環 */
  function templatesFor(difficulty, categories) {
    return TEMPLATES.filter(function (t) {
      return t.levels.indexOf(difficulty) >= 0 && (!categories || categories.indexOf(t.category) >= 0);
    });
  }

  /**
   * 問題セットの設計図をつくる（seed から決定的）。
   * opts = {difficulty, count, categories?, seed, fixed?}
   * 戻り値：[{templateId, seed, difficulty, fixed}]
   */
  function planSet(opts) {
    var rng = mulberry32(mixSeed(opts.seed, 777));
    var pool = templatesFor(opts.difficulty, opts.categories);
    if (opts.fixed) pool = pool.filter(function (t) { return t.id !== 'P05-noneed' || M.analyzePair(opts.fixed.table, 0, 1, 0, 1).bothAbs !== null; });
    var byCat = {};
    pool.forEach(function (t) { (byCat[t.category] = byCat[t.category] || []).push(t); });
    var cats = Object.keys(byCat).sort();
    if (!cats.length) return [];
    cats.forEach(function (c) { byCat[c] = shuffle(rng, byCat[c]); });
    var counters = {};
    var list = [];
    for (var k = 0; k < opts.count; k++) {
      var c = cats[k % cats.length];
      counters[c] = (counters[c] || 0);
      var t = byCat[c][counters[c] % byCat[c].length];
      counters[c]++;
      list.push({ templateId: t.id, category: c, order: k });
    }
    list.sort(function (a, b) { return a.category < b.category ? -1 : (a.category > b.category ? 1 : a.order - b.order); });
    return list.map(function (it, k) {
      return { templateId: it.templateId, seed: mixSeed(opts.seed, k), difficulty: opts.difficulty, fixed: opts.fixed || null };
    });
  }

  /**
   * 問題セットを生成。
   * 固定例題（機会費用が同じ表など）で作れない問題があったときは、
   * まず同じ分野の別の問題、なければほかの分野の問題で補い、指定した問題数にそろえる。
   * それでも作れなかった数を dropped で返す。
   */
  function generateSet(opts) {
    var specs = planSet(opts);
    var pool = templatesFor(opts.difficulty, opts.categories);
    var unusable = {}; // この条件では作れないと分かったテンプレート
    var picked = [], dropped = 0, seen = {}, catCount = {};
    // 同じ問題かどうか：問題文と表が同じなら同じ（選択肢の並び順がちがうだけのものも同じとみなす）
    function key(p) { return p.prompt + '|' + JSON.stringify(p.scenario.table) + '|' + (p.choices || []).slice().sort().join('/'); }
    specs.forEach(function (s, k) {
      var p = unusable[s.templateId] ? null : buildProblem(s);
      if (!p) unusable[s.templateId] = true;
      if (!p || seen[key(p)]) {
        p = null;
        var cat = BY_ID[s.templateId].category;
        // 代わりの候補：同じ分野 → 問題の少ない分野の順
        var others = pool.filter(function (t) { return t.category !== cat; })
          .sort(function (x, y) { return (catCount[x.category] || 0) - (catCount[y.category] || 0); });
        var alts = pool.filter(function (t) { return t.category === cat; }).concat(others);
        for (var a = 0; a < alts.length * 3 && !p; a++) {
          var t = alts[a % alts.length];
          if (unusable[t.id]) continue;
          var s2 = { templateId: t.id, seed: mixSeed(s.seed, 900 + k * 31 + a), difficulty: s.difficulty, fixed: s.fixed };
          var cand = buildProblem(s2);
          if (!cand) { unusable[t.id] = true; continue; }
          if (!seen[key(cand)]) { p = cand; s = s2; }
        }
        // 同じ問題は出さない。作れなければ、その分は減らして dropped で知らせる
      }
      if (p) { seen[key(p)] = true; catCount[p.category] = (catCount[p.category] || 0) + 1; picked.push({ p: p, s: s, k: k }); }
      else dropped++;
    });
    // 分野の順（P01→P05）にならべ直す
    picked.sort(function (x, y) { return x.p.category < y.p.category ? -1 : (x.p.category > y.p.category ? 1 : x.k - y.k); });
    return { problems: picked.map(function (x) { return x.p; }), specs: picked.map(function (x) { return x.s; }), dropped: dropped };
  }

  /** 類題：同じテンプレートで別の数値（固定例題のときは同じ表で別の問い方） */
  function similarSpec(spec, n) {
    return { templateId: spec.templateId, seed: mixSeed(spec.seed, 5000 + (n || 1)), difficulty: spec.difficulty, fixed: spec.fixed || null };
  }

  /* ---------- 解答の判定 ---------- */

  /** 生徒の数値入力を読む。"1/2"、"０．５"、"0.5個" など。読めなければ null */
  function parseAnswer(text) {
    var s = M.toHalfWidth(String(text || '')).replace(/[個こ\s]/g, '').replace(/[÷]/g, '/');
    if (s === '') return null;
    var m;
    if ((m = /^(\d+)\/(\d+)$/.exec(s))) { var d = Number(m[2]); if (d === 0) return null; return Number(m[1]) / d; }
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    if (/^\.\d+$/.test(s)) return Number('0' + s);
    return null;
  }

  /**
   * 数値の正誤。割り切れる答えは（ほぼ）一致、割り切れない答えは小数第2位までの近似も正解。
   * 戻り値：{ok, parsed, close}
   */
  function checkNumber(problem, text) {
    var v = parseAnswer(text);
    if (v === null) return { ok: false, parsed: null };
    var ans = problem.answer.toNumber();
    // 正解とするもの：①ぴったり同じ（分数・小数）
    //   ②小数第2位で四捨五入した値（問題文で「小数第2位まで」と許している。例 1/8→0.13、2/3→0.67）
    //   ③それより細かい近似（例 0.125、0.667）
    // 切り捨て（1/8→0.12、2/3→0.66）は正解にしない
    var rounded2 = Number(problem.answer.toDecimalString(2));
    // ②の「小数第2位で四捨五入」は、答えが0.1以上のときだけ認める
    //   （答えが小さいと四捨五入で0になり、「機会費用0」を正解にしてしまうため。例 1/250→0 は不正解）
    // ③の細かい近似は、答えの大きさに対して0.5%未満のずれまで（小さい答えを甘く採点しない）
    var ok = Math.abs(v - ans) < 1e-9 ||
      (Math.abs(ans) >= 0.1 && Math.abs(v - rounded2) < 1e-9) ||
      (ans !== 0 && Math.abs(v - ans) / Math.abs(ans) < 0.005);
    return { ok: ok, parsed: v, close: !ok && Math.abs(v - ans) <= Math.abs(ans) * 0.1 + 0.005 };
  }

  var api = {
    CATEGORIES: CATEGORIES, DIFFICULTIES: DIFFICULTIES, TEMPLATES: TEMPLATES, BY_ID: BY_ID,
    mulberry32: mulberry32, mixSeed: mixSeed, newSeed: newSeed,
    genScenario: genScenario, buildProblem: buildProblem, verifyProblem: verifyProblem,
    planSet: planSet, generateSet: generateSet, similarSpec: similarSpec, templatesFor: templatesFor,
    fixedScenarioUsable: fixedScenarioUsable, findBothIncrease: findBothIncrease,
    parseAnswer: parseAnswer, checkNumber: checkNumber
  };
  if (isNode) module.exports = api;
  else { root.TS = root.TS || {}; root.TS.problems = api; }
})(typeof window !== 'undefined' ? window : this);
