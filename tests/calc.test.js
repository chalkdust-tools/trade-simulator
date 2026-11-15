/*
 * 計算テスト（仕様書10章の回帰テスト）
 * 実行：node tests/calc.test.js
 */
'use strict';
var Frac = require('../js/fraction.js');
var M = require('../js/model.js');
var P = require('../js/problems.js');

var pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  ✔ ' + name); }
  else { fail++; console.log('  ✘ ' + name + (detail ? '  → ' + detail : '')); }
}
function eqF(f, n, d) { return f.eq(new Frac(n, d === undefined ? 1 : d)); }
function section(t) { console.log('\n■ ' + t); }

/* ---------- 10-1 初期例題 ---------- */
section('10-1 初期例題：Aさん(10,5)、Bさん(6,4)');
var sc = M.defaultScenario();
var pair = M.analyzePair(sc.table, 0, 1, 0, 1);

ok(pair.abs.x === 0 && pair.abs.y === 0 && pair.bothAbs === 0, '絶対優位：Aさんが両財で優位');
ok(eqF(pair.oc[0].x, 1, 2), '商品A1個の機会費用 Aさん = 1/2個', pair.oc[0].x);
ok(eqF(pair.oc[1].x, 2, 3), '商品A1個の機会費用 Bさん = 2/3個', pair.oc[1].x);
ok(eqF(pair.oc[0].y, 2), '商品B1個の機会費用 Aさん = 2個', pair.oc[0].y);
ok(eqF(pair.oc[1].y, 3, 2), '商品B1個の機会費用 Bさん = 3/2個', pair.oc[1].y);
ok(pair.comp.x === 0 && pair.comp.y === 1 && !pair.tie, '比較優位：商品AはAさん、商品BはBさん');

var base = M.production(sc, [[50, 50], [50, 50]]).total;
ok(eqF(base[0], 8) && eqF(base[1], 9, 2), '50%ずつ：商品A 8個、商品B 4.5個', base.join(', '));

var mix = M.production(sc, [[80, 20], [10, 90]]).total;
ok(eqF(mix[0], 43, 5) && eqF(mix[1], 23, 5), 'Aさん80%・Bさん10%：商品A 8.6個、商品B 4.6個', mix.join(', '));
var cmp = M.compareTotals(base, mix);
ok(cmp[0].sign === 1 && cmp[1].sign === 1, '↑ 基準配分より両方ふえる');
ok(mix[0].toDisplay() === '8.6' && mix[1].toDisplay() === '4.6', '表示も 8.6 / 4.6');

var specSh = M.specializationShares(sc, pair);
var spec = M.production(sc, specSh).total;
ok(JSON.stringify(specSh) === '[[100,0],[0,100]]', '完全分業の配分：Aさん商品A100%、Bさん商品B100%');
ok(eqF(spec[0], 10) && eqF(spec[1], 4), '完全分業：商品A 10個、商品B 4個', spec.join(', '));
var cmp2 = M.compareTotals(base, spec);
ok(cmp2[0].sign === 1 && cmp2[1].sign === -1, '↑ 50:50と比べて商品Bはへる（両方ふえるとは言えない）');

/* ---------- 10-2 境界 ---------- */
section('10-2 境界テスト');
var tieSc = { producers: ['A国', 'B国'], goods: ['X', 'Y'], table: [[10, 5], [6, 3]], labor: [1, 1] };
var tp = M.analyzePair(tieSc.table, 0, 1, 0, 1);
ok(tp.tie && tp.comp.x === null && tp.comp.y === null, '機会費用が同じ → 比較優位に差がない');
ok(M.specializationShares(tieSc, tp) === null, '↑ 完全分業の配分は出さない');

var dec = M.analyzePair([[2.5, 1.25], [3, 2]], 0, 1, 0, 1);
ok(eqF(dec.oc[0].x, 1, 2) && eqF(dec.oc[1].x, 2, 3), '小数入力でも機会費用は厳密（1/2, 2/3）');

// 入力検査
var bad = ['', '0', '-3', 'abc', '1e5', '10000', '1.234', 'NaN', 'Infinity'];
bad.forEach(function (s) { ok(!M.parseCell(s).ok, '不正入力を拒否: "' + s + '"', M.parseCell(s).msg); });
ok(M.parseCell('１０').ok && M.parseCell('１０').value === 10, '全角数字「１０」は10として受け付ける');
ok(M.parseCell('2.5').ok, '小数 2.5 は受け付ける');

ok(!M.validateScenario({ producers: ['A', 'A'], goods: ['x', 'y'], table: [[1, 2], [3, 4]] }).ok, '同じ名前の重複を検出');
ok(!M.validateScenario({ producers: ['A', 'B', 'C', 'D', 'E'], goods: ['x', 'y'], table: [] }).ok, '5国は拒否');

// 再配分：合計100、負にならない
section('配分（3〜4財の自動再配分）');
var rngA = P.mulberry32(42), allOk = true, sample = '';
for (var t = 0; t < 5000; t++) {
  var n = 2 + Math.floor(rngA() * 3);
  var row = M.equalRow(n);
  for (var step = 0; step < 6; step++) {
    var idx = Math.floor(rngA() * n), val = Math.floor(rngA() * 101);
    row = M.rebalanceRow(row, idx, val);
    var sum = row.reduce(function (a, b) { return a + b; }, 0);
    if (sum !== 100 || row.some(function (v) { return v < 0 || v > 100 || !Number.isInteger(v); }) || row[idx] !== val) { allOk = false; sample = JSON.stringify(row); }
  }
}
ok(allOk, '5000回ランダム操作：常に合計100%・0〜100の整数・指定値を保持', sample);
ok(JSON.stringify(M.rebalanceRow([50, 30, 20], 0, 60)) === '[60,24,16]', '[50,30,20]で1つ目を60% → [60,24,16]（比率を保つ）', JSON.stringify(M.rebalanceRow([50, 30, 20], 0, 60)));
ok(JSON.stringify(M.rebalanceRow([100, 0, 0], 0, 40)) === '[40,30,30]', '残りが全部0なら均等に分ける');
ok(JSON.stringify(M.equalRow(3)) === '[34,33,33]', '3財の初期配分は34:33:33');

// 4×4
section('4×4');
var s44 = M.PRESETS.filter(function (p) { return p.id === 'c4'; })[0].make();
ok(M.validateScenario(s44).ok, '4×4プリセットは有効');
var prod44 = M.production(s44, M.equalShares(4, 4));
ok(prod44.total.length === 4 && prod44.total.every(function (f) { return isFinite(f.toNumber()) && f.toNumber() > 0; }), '4×4の総生産量が有限・正');
var r44 = M.resizeScenario(sc, 4, 4);
ok(r44.table.length === 4 && r44.table[0].length === 4 && r44.table[0][0] === 10 && r44.table[1][1] === 4, 'サイズ変更で既存の値を保持');
var back = M.resizeScenario(r44, 2, 2);
ok(JSON.stringify(back.table) === JSON.stringify(sc.table), '4×4→2×2に戻すと元の表');

/* ---------- 問題バンク ---------- */
section('問題バンク：大量生成して検算');
var counts = {}, failures = 0, nanFound = false;
P.TEMPLATES.forEach(function (tpl) {
  tpl.levels.forEach(function (lv) {
    for (var s = 1; s <= 400; s++) {
      var p = P.buildProblem({ templateId: tpl.id, seed: s * 7919, difficulty: lv });
      if (!p) { failures++; continue; }
      counts[tpl.id] = (counts[tpl.id] || 0) + 1;
      if (p.format === 'number' && !isFinite(p.answer.toNumber())) nanFound = true;
      if (/NaN|undefined|Infinity/.test(p.prompt + p.explanation + p.steps.join('') + p.hints.join('') + (p.choices || []).join(''))) nanFound = true;
    }
  });
});
ok(failures === 0, '全テンプレート×難易度×400シードで生成成功', failures + '件失敗');
ok(!nanFound, '文面に NaN / undefined / Infinity が出ない');
console.log('    生成数: ' + JSON.stringify(counts));

var setA = P.generateSet({ difficulty: 'standard', count: 10, seed: 123456 });
var setB = P.generateSet({ difficulty: 'standard', count: 10, seed: 123456 });
ok(setA.problems.length === 10 && setA.dropped === 0, '標準10問がそろう');
ok(JSON.stringify(setA.problems.map(function (p) { return p.prompt; })) === JSON.stringify(setB.problems.map(function (p) { return p.prompt; })), '同じseedなら同じ問題（再現性）');
var cats = setA.problems.map(function (p) { return p.category; });
ok(['P01', 'P02', 'P03', 'P04', 'P05'].every(function (c) { return cats.indexOf(c) >= 0; }), '10問にP01〜P05がすべて含まれる', cats.join(','));
var intro5 = P.generateSet({ difficulty: 'intro', count: 5, seed: 99 });
ok(intro5.problems.length === 5 && intro5.problems.every(function (p) { return p.format === 'choice'; }), '入門5問はすべて選択式');

// 固定例題（授業プリントの表）から作る
var fx = P.generateSet({ difficulty: 'standard', count: 10, seed: 5, fixed: sc });
ok(fx.problems.length === 10 && fx.problems.every(function (p) { return JSON.stringify(p.scenario.table) === '[[10,5],[6,4]]'; }), '例題の表を固定して10問つくれる');
var fxTie = P.generateSet({ difficulty: 'standard', count: 10, seed: 5, fixed: tieSc });
ok(fxTie.problems.every(function (p) { return p.templateId !== 'P04-spec'; }), '機会費用が同じ表では「完全分業」問題を出さない');
var tieWho = P.buildProblem({ templateId: 'P02-who', seed: 1, difficulty: 'standard', fixed: tieSc });
ok(tieWho && tieWho.choices[tieWho.answerIndex] === '比較優位に差はない', '同率の表では「比較優位に差はない」が正解');

// 固定例題での具体的な答え
section('固定例題での具体的な答え');
for (var sd = 1; sd < 60; sd++) {
  var q = P.buildProblem({ templateId: 'P03-oc', seed: sd, difficulty: 'standard', fixed: sc });
  if (q.params.p === 1 && q.params.x === 0) { ok(eqF(q.answer, 2, 3) && q.answer.toDisplay() === '2/3（約0.67）', 'Bさん商品Aの機会費用 = 2/3（表示「2/3（約0.67）」）'); break; }
}
var dummy = { answer: new Frac(2, 3) };
ok(P.checkNumber(dummy, '2/3').ok && P.checkNumber(dummy, '4/6').ok && P.checkNumber(dummy, '0.67').ok && P.checkNumber(dummy, '０．６７').ok, '2/3 の解答：「2/3」「4/6」「0.67」「０．６７」を正解');
ok(!P.checkNumber(dummy, '0.6').ok && !P.checkNumber(dummy, '1.5').ok && !P.checkNumber(dummy, '3/2').ok, '2/3 の解答：「0.6」「1.5」「3/2」は不正解');
var half = { answer: new Frac(1, 2) };
ok(P.checkNumber(half, '0.5').ok && P.checkNumber(half, '1/2個').ok && !P.checkNumber(half, '0.51').ok, '1/2 の解答：0.5・1/2個は正解、0.51は不正解');
ok(P.parseAnswer('abc') === null && P.parseAnswer('1/0') === null, '読めない入力・0除算は null');

// 検証が壊れた問題を弾くこと
var good = P.buildProblem({ templateId: 'P02-who', seed: 3, difficulty: 'standard' });
var broken = JSON.parse(JSON.stringify(good)); broken.answerIndex = (good.answerIndex + 1) % 3;
broken.scenario = good.scenario;
ok(!P.verifyProblem(broken).ok, '正解番号を書き換えた問題は検証で弾かれる');

console.log('\n結果: ' + pass + ' 件成功, ' + fail + ' 件失敗');
process.exit(fail ? 1 : 0);
