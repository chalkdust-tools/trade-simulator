/*
 * 追加の回帰テスト — 比較生産費説シミュレーター（2026-11-15）
 * tests/ フォルダに置いてあります。リポジトリのトップで
 *   node --test tests/regression.test.js
 * で実行してください。現行版では一部のテストが失敗する想定です。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/problems.js');
const Frac = require('../js/fraction.js');

const tied = {
  producers: ['A国', 'B国'], goods: ['商品A', '商品B'],
  table: [[10, 5], [6, 3]]
};

test('小数第2位まででよいと指定したとき、1/8 の 0.13 を正答として扱う', () => {
  const prob = { answer: new Frac(1, 8) };
  assert.equal(P.checkNumber(prob, '0.13').ok, true);
});

test('標準・固定例題の同率表でも、指定した10問が揃う', () => {
  const set = P.generateSet({ difficulty: 'standard', count: 10, seed: 12345, fixed: tied });
  assert.equal(set.problems.length, 10, `実際に生成した問題は${set.problems.length}問`);
  assert.equal(set.dropped, 0);
});

test('入門・固定例題の同率表でも、指定した10問が揃う', () => {
  const set = P.generateSet({ difficulty: 'intro', count: 10, seed: 12345, fixed: tied });
  assert.equal(set.problems.length, 10, `実際に生成した問題は${set.problems.length}問`);
  assert.equal(set.dropped, 0);
});

test('片方同数の表では、「商品ごとに多い国が違う」と誤説明しない', () => {
  const fixed = {
    producers: ['A国', 'B国'], goods: ['パン', '服'],
    table: [[10, 5], [10, 4]]
  };
  const prob = P.buildProblem({ templateId: 'P01-both', seed: 789, difficulty: 'intro', fixed });
  assert.ok(prob);
  assert.equal(prob.answerIndex, 2);
  assert.doesNotMatch(prob.choices[2], /多く作れる商品がそれぞれちがう/);
  assert.doesNotMatch(prob.explanation, /多く作れる商品がそれぞれちがう/);
  assert.match(prob.explanation, /同じ|同数|差がない/);
});

test('基本の比較優位判定：2/3を0.67でも正答とする（既存動作保持）', () => {
  assert.equal(P.checkNumber({ answer: new Frac(2, 3) }, '0.67').ok, true);
});

/* ---- ここから：修正時に追加したテスト（Claude） ---- */
test('小数第2位の四捨五入は正解、切り捨ては不正解（3/8→0.38○、1/8→0.12×、2/3→0.66×）', () => {
  assert.equal(P.checkNumber({ answer: new Frac(3, 8) }, '0.38').ok, true);
  assert.equal(P.checkNumber({ answer: new Frac(3, 8) }, '0.375').ok, true);
  assert.equal(P.checkNumber({ answer: new Frac(1, 8) }, '0.12').ok, false);
  assert.equal(P.checkNumber({ answer: new Frac(2, 3) }, '0.66').ok, false);
  assert.equal(P.checkNumber({ answer: new Frac(1, 2) }, '0.51').ok, false);
});

test('丸めた数を、丸めていないように表示しない（1/8 は「1/8（0.125）」）', () => {
  assert.equal(new Frac(1, 8).toDisplay(), '1/8（0.125）');
  assert.equal(new Frac(2, 3).toDisplay(), '2/3（約0.67）');
  assert.equal(new Frac(43, 5).toDisplay(), '8.6');
  assert.equal(new Frac(297, 400).toDisplay(), '0.7425');      // 割り切れるものは正確に
  assert.equal(new Frac(200, 301).toDisplay(), '約0.66');      // 分母が大きく割り切れないものは「約」
});

test('固定例題（同率・片方同数・ふつう）× 入門/標準 × 3〜20問：10問まではそろい、同じ問題は重ならない', () => {
  const tables = [[[10, 5], [6, 3]], [[10, 5], [10, 4]], [[10, 5], [6, 4]], [[8, 1], [5, 2]]];
  for (const table of tables) for (const difficulty of ['intro', 'standard']) for (const count of [3, 5, 10, 20]) {
    const set = P.generateSet({ difficulty, count, seed: 12345, fixed: { producers: ['A国', 'B国'], goods: ['商品A', '商品B'], table } });
    // 10問までは必ずそろう。20問は、1つの表で作れるちがう問題が足りないときだけ減ってよい（減った数は dropped で知らせる）
    if (count <= 10) assert.equal(set.problems.length, count, `${JSON.stringify(table)} ${difficulty} ${count}`);
    else assert.ok(set.problems.length >= 12, `${JSON.stringify(table)} ${difficulty} ${count}: ${set.problems.length}問`);
    assert.equal(set.problems.length + set.dropped, count);
    const keys = set.problems.map(p => p.prompt + JSON.stringify((p.choices || []).slice().sort()));
    assert.equal(new Set(keys).size, keys.length, '重複あり ' + JSON.stringify(table) + difficulty + count);
    assert.ok(set.problems.every(p => P.verifyProblem(p).ok));
  }
});

test('ランダム出題でも、問題数がそろい検算に通る（seed 200通り）', () => {
  for (let seed = 1; seed <= 200; seed++) for (const difficulty of ['intro', 'standard']) {
    const set = P.generateSet({ difficulty, count: 10, seed });
    assert.equal(set.problems.length, 10);
  }
});

/* ---- 再検品（v2）の指摘 C1 に対するテスト（Claude） ---- */
test('C1：とても小さい機会費用（1/250）を「約0」と表示せず、「0」を正解にしない', () => {
  const fixed = { producers: ['A国', 'B国'], goods: ['商品A', '商品B'], table: [[250, 1], [200, 2]] };
  const p = P.buildProblem({ templateId: 'P03-oc', seed: 7, difficulty: 'standard', fixed });
  assert.equal(p.answer.toFracString(), '1/250');
  assert.doesNotMatch(p.answer.toDisplay(), /約0$|約0（|^0$/);
  assert.equal(P.checkNumber(p, '0').ok, false);
  assert.equal(P.checkNumber(p, '0.00').ok, false);
  assert.equal(P.checkNumber(p, '1/250').ok, true);
  assert.equal(P.checkNumber(p, '0.004').ok, true);
  assert.match(p.prompt, /分数で答えよう/);
  assert.match(p.explanation, /1\/250/);
});

test('C1：既存の判定は保つ（1/8→0.13○、2/3→0.67○、0.12・0.66×）。小さい答えは割合で厳しく判定', () => {
  assert.equal(P.checkNumber({ answer: new Frac(1, 8) }, '0.13').ok, true);
  assert.equal(P.checkNumber({ answer: new Frac(2, 3) }, '0.67').ok, true);
  assert.equal(P.checkNumber({ answer: new Frac(1, 8) }, '0.12').ok, false);
  assert.equal(P.checkNumber({ answer: new Frac(2, 3) }, '0.66').ok, false);
  assert.equal(P.checkNumber({ answer: new Frac(1, 300) }, '0.003').ok, false);
  assert.equal(P.checkNumber({ answer: new Frac(1, 300) }, '0.00333').ok, true);
});

test('C1：正の値は、どんな分数でも表示が「0」にならない', () => {
  for (let n = 1; n <= 3; n++) for (let d = 2; d <= 2000; d += 7) {
    const s = new Frac(n, d).toDisplay();
    assert.ok(!/^約?0$/.test(s) && !/（約?0）/.test(s), `${n}/${d} → ${s}`);
  }
});
