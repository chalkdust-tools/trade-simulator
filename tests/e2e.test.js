/*
 * ブラウザ操作テスト（Playwright）
 * 実行：python3 -m http.server 8123 を起動した状態で  node tests/e2e.test.js
 * 環境変数 BASE でURLを変更可。SHOTS=フォルダ でスクリーンショット・PDFを保存。
 */
'use strict';
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8123/index.html';
const SHOTS = process.env.SHOTS || '';

let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  ✔ ' + name); } else { fail++; console.log('  ✘ ' + name + (detail !== undefined ? '  → ' + detail : '')); }
}
function section(t) { console.log('\n■ ' + t); }

async function setRange(page, selector, value) {
  await page.$eval(selector, (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
}
async function noBadText(page) {
  const t = await page.evaluate(() => document.body.innerText);
  return !/NaN|undefined|Infinity|\[object/.test(t);
}

/** 出ている問題を解く。mode: 'correct'（正解を探す）| 'wrongThenReveal' */
async function solveCurrent(page, mode) {
  const q = page.locator('.qview').last();
  if (await q.locator('.num-input').count()) {
    if (mode === 'wrongThenReveal' || true) {
      // 数値問題：わざと誤答 → ヒントが出ることを確認 → 解説
      await q.locator('.num-input').fill('999');
      await q.locator('button:has-text("答え合わせ")').click();
      const hint = await q.locator('.hint-list li').count();
      await q.locator('button:has-text("答えと解説を見る")').click();
      return { hintAfterWrong: hint };
    }
  }
  const n = await q.locator('.choice').count();
  for (let k = 0; k < n; k++) {
    const b = q.locator('.choice').nth(k);
    if (await b.isDisabled()) continue;
    await b.click();
    if (await q.locator('.feedback.right, .feedback.reveal').count()) break;
  }
  return {};
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => { if (/alert|1/.test(d.message()) && d.type() === 'alert') errors.push('ALERT ' + d.message()); d.accept(); });

  /* ---------- トップ ---------- */
  section('トップ');
  await page.goto(BASE + '#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  ok(await page.locator('h1.hero-title').innerText() === '比較生産費説シミュレーター', 'タイトル表示');
  for (const t of ['はじめる', '例題から始める', '使い方']) ok(await page.locator('.hero-actions >> text=' + t).count() === 1, 'ヒーローのボタン「' + t + '」');
  ok(await page.locator('.mode-card').count() === 3, 'モードカード3枚');
  const hrefs = await page.$$eval('.mode-card', els => els.map(e => e.getAttribute('href')));
  ok(JSON.stringify(hrefs) === '["#/sim","#/practice","#/study"]', 'モードカードのリンク先', hrefs);
  const brokenLinks = await page.$$eval('a[href]', els => els.map(e => e.getAttribute('href')).filter(h => !/^#\//.test(h) && !/^#/.test(h)));
  ok(brokenLinks.length === 0, '外部・架空URLへのリンクがない', brokenLinks);

  // 不正入力
  const cell = page.locator('.edit-table .cell-input').first();
  await cell.fill('0');
  ok(await page.locator('.form-errors li').count() > 0, '0を入れるとエラー表示');
  ok(await page.locator('button:has-text("この設定で始める")').isDisabled(), '↑ エラー中は「この設定で始める」が押せない');
  await cell.fill('abc');
  ok(/数字だけ/.test(await page.locator('.form-errors').innerText()), '文字を入れると「数字だけを入れてください」');
  await cell.fill('10');
  ok(!(await page.locator('button:has-text("この設定で始める")').isDisabled()), '直すと押せる');

  // XSS
  const nameInp = page.locator('.name-inputs input').first();
  await nameInp.fill('<img src=x>');
  ok(await page.locator('.edit-table tbody th').first().innerText() === '<img src=x>', '名前のHTMLは文字として表示（XSS対策）');
  ok(await page.locator('img').count() === 0, '↑ img要素は作られない');
  await nameInp.fill('Aさん');

  /* ---------- 4×4 ---------- */
  section('4×4の設定とシミュレーション');
  await page.selectOption('#ed1-people', '4');
  await page.selectOption('#ed1-cube', '4');
  ok(await page.locator('.edit-table .cell-input').count() === 16, '4×4で16個の数値欄');
  const cells = page.locator('.edit-table .cell-input');
  const vals = [12, 8, 6, 4, 6, 6, 4, 2, 8, 4, 8, 6, 3, 3, 3, 6];
  for (let k = 0; k < 16; k++) await cells.nth(k).fill(String(vals[k]));
  await page.click('button:has-text("この設定で始める")');
  await page.waitForSelector('.page-sim');
  ok(await page.locator('.alloc-card').count() === 4, '配分カードが4つ');
  ok(await page.locator('.alloc-card .range').count() === 16, 'スライダーが16本');
  await setRange(page, '#sh-0-0', 70);
  await setRange(page, '#sh-2-3', 0);
  const sums = await page.$$eval('.alloc-card', cards => cards.map(c => Array.from(c.querySelectorAll('.range')).reduce((a, r) => a + Number(r.value), 0)));
  ok(sums.every(s => s === 100), '各国の配分合計が100%', sums);
  const r0 = await page.$$eval('.alloc-card:first-child .range', rs => rs.map(r => Number(r.value)));
  ok(r0[0] === 70 && r0.every(v => v >= 0), '1つ目を70%にすると残りが自動調整', r0);
  ok(await noBadText(page), 'NaN・undefined が表示されない');
  // 合計 商品A = 12*0.70 + 6*0.25 + 8*0.34 + 3*0.25 = 8.4+1.5+2.72+0.75 = 13.37
  // （C国は商品Dを0%にしたので、残り100%が34:33:33に再配分される）
  const rowA = await page.locator('.result-table tbody tr').first().innerText();
  ok(/13\.37個/.test(rowA), '4×4の総生産量（商品A）＝13.37個', rowA);
  ok(await page.locator('.pair-pick select').count() === 4, '3国以上では2国・2財を選ぶ欄を表示');
  ok(/自動判定せず/.test(await page.locator('#s4').innerText()), '↑「自動判定しない」旨の説明');
  if (SHOTS) await page.screenshot({ path: SHOTS + 'sim-4x4.png', fullPage: true });

  // 戻る・再読み込みで状態が残る
  await page.goBack();
  await page.waitForSelector('.page-home');
  ok(await page.locator('.edit-table .cell-input').count() === 16, 'ブラウザの「戻る」でも4×4の設定が残る');
  await page.goForward();
  await page.waitForSelector('.page-sim');
  await page.reload();
  const r0b = await page.$$eval('.alloc-card:first-child .range', rs => rs.map(r => Number(r.value)));
  ok(r0b[0] === 70, '再読み込みしても配分が残る', r0b);

  /* ---------- 2×2 初期例題の計算 ---------- */
  section('初期例題（10・5／6・4）の計算表示');
  await page.goto(BASE + '#/');
  await page.click('button:has-text("初期値に戻す")');
  await page.click('button:has-text("この設定で始める")');
  await page.waitForSelector('.page-sim');
  const resultText = async () => (await page.locator('.result-table tbody').innerText()).replace(/\s+/g, ' ');
  let rt = await resultText();
  ok(/商品A 8個 8個/.test(rt) && /商品B 4\.5個 4\.5個/.test(rt), '基準（50%ずつ）：商品A 8個、商品B 4.5個', rt);
  await setRange(page, '#sh-0', 80);
  await setRange(page, '#sh-1', 10);
  rt = await resultText();
  ok(/8\.6個 ＋0\.6（ふえた）/.test(rt) && /4\.6個 ＋0\.1（ふえた）/.test(rt), 'Aさん80%・Bさん10%：8.6個・4.6個、両方「＋」', rt);
  await page.click('button:has-text("比較優位どおりに分業する")');
  rt = await resultText();
  ok(/10個 ＋2（ふえた）/.test(rt) && /4個 −0\.5（へった）/.test(rt), '完全分業：商品A 10個（＋2）、商品B 4個（−0.5 へった）', rt);
  const oc = (await page.locator('.oc-table').innerText()).replace(/\s+/g, ' ');
  ok(/5÷10＝ 1\/2個|5÷10＝1\/2個|5÷10＝ ?0\.5個/.test(oc) && /4÷6＝ ?2\/3（約0\.67）個/.test(oc), '機会費用：Aさん 5÷10、Bさん 4÷6＝2/3', oc);
  ok(/10÷5＝ ?2個/.test(oc) && /6÷4＝ ?1\.5個/.test(oc), '機会費用：Aさん 10÷5＝2、Bさん 6÷4＝1.5', oc);
  const concl = await page.locator('.conclusion').innerText();
  ok(/商品Aの比較優位：Aさん/.test(concl) && /商品Bの比較優位：Bさん/.test(concl), '比較優位：商品AはAさん、商品BはBさん', concl);
  ok(/両方の商品で多く作れます/.test(await page.locator('#s4').innerText()), '「両方多く作れても比較優位は別」の注記');
  if (SHOTS) await page.screenshot({ path: SHOTS + 'sim-2x2.png', fullPage: true });

  /* ---------- 自習モード（標準） ---------- */
  section('自習モード（標準・30分）を最後まで');
  await page.goto(BASE + '#/study');
  await page.click('button:has-text("標準コース")');
  const next = page.locator('.study-nav button:has-text("次へ")');
  ok(await page.locator('.step-title').innerText() === '今日のゴール', 'ステップ1：今日のゴール');
  await next.click();
  ok(await next.isDisabled(), '予想：選ぶまで「次へ」は押せない');
  ok((await page.locator('.gate').innerText()).length > 0, '↑ 押せない理由を表示');
  await page.locator('.choice:has-text("ない")').first().click();
  await page.locator('.choice:has-text("商品B")').click();
  ok(!(await next.isDisabled()), '予想を2つ選ぶと「次へ」');
  await next.click();
  // 絶対優位：わざとまちがえてヒントの階段を確認
  await page.locator('.choice:has-text("Bさん")').click();
  ok(await page.locator('.hint-list li').count() === 1, '不正解 → ヒント1が出る');
  ok(await page.locator('.choice.wrong').isDisabled(), '↑ 選んだ誤答は押せなくなる');
  await page.locator('.choice:has-text("どちらも同じ")').click();
  ok(await page.locator('.feedback.reveal').count() === 1, '2回目の不正解（残り1つ）→ 解説と正解を表示（止まらない）');
  ok(!(await next.isDisabled()), '↑ そのまま「次へ」に進める');
  await next.click();
  // 機会費用：つづきを見る×3、数値入力
  for (let k = 0; k < 3; k++) await page.click('button:has-text("つづきを見る")');
  const num = page.locator('.num-input');
  await num.fill('abc'); await page.click('button:has-text("答え合わせ")');
  ok(/読めませんでした/.test(await page.locator('.feedback').innerText()), '数として読めない入力は誤答に数えず案内');
  await num.fill('0.6'); await page.click('button:has-text("答え合わせ")');
  ok(await page.locator('.hint-list li').count() === 1 && /おしい/.test(await page.locator('.feedback').innerText()), '0.6 → 「おしい」＋ヒント1');
  await num.fill('1.5'); await page.click('button:has-text("答え合わせ")');
  ok(await page.locator('.hint-list li').count() === 2, '2回目の不正解 → ヒント2');
  await num.fill('2/3'); await page.click('button:has-text("答え合わせ")');
  ok(await page.locator('.feedback.right').count() === 1, '「2/3」で正解');
  await next.click();
  await page.locator('.choice:has-text("Aさん（0.5個）")').click();
  ok(/予想とちがう|「Aさんは商品B」と予想/.test(await page.locator('.study-card.pred').innerText()), '予想ふりかえり（商品Bと予想した場合の説明）');
  await next.click();
  // 実験
  await setRange(page, '#exp0', 80); await setRange(page, '#exp1', 10);
  ok(/できました/.test(await page.locator('.exp-status').innerText()), '実験：80%・10%で「両方ふえた」');
  await page.click('button:has-text("完全分業を試す")');
  ok(/4\.5個→4個/.test(await page.locator('.exp-status').innerText()), '完全分業では商品Bがへると説明');
  ok(/かならず両方ふえる」わけではない/.test(await page.locator('.study-body').innerText()), '大事なポイント表示');
  if (SHOTS) await page.screenshot({ path: SHOTS + 'study-exp.png', fullPage: true });
  await next.click();
  // 演習
  let guard = 0, sawHint = false;
  while (await page.locator('.step-title:has-text("演習問題")').count() && guard++ < 30) {
    const r = await solveCurrent(page);
    if (r.hintAfterWrong) sawHint = true;
    await page.locator('.quiz .next-row .btn-primary').click();
  }
  ok(guard >= 8 && guard < 30, '演習8問を解き終えてまとめへ', guard);
  ok(sawHint, '数値問題で誤答 → ヒント表示を確認');
  ok(await page.locator('.step-title').innerText() === 'まとめ', 'ステップ8：まとめ');
  for (let k = 0; k < 3; k++) await solveCurrent(page);
  await page.fill('#refl', 'かならずしも得とはいえない。比較優位のあるものに集中すると…');
  await page.click('button:has-text("模範解答と見くらべる")');
  ok(await page.locator('.check-group input[type=checkbox]').count() === 3, '模範解答と観点別の自己チェック');
  await page.locator('.study-nav button:has-text("学習結果を見る")').click();
  await page.waitForSelector('.page-results');
  const res = await page.locator('.result-panel').innerText();
  ok(/解いた問題/.test(res) && /1回目で正解/.test(res) && /ヒントを見た/.test(res) && /再挑戦/.test(res), '結果：解答数・初回正答・ヒント・再挑戦を表示');
  ok(/比較優位/.test(res) && /機会費用/.test(res), '結果：学んだ用語');
  ok(/かならずしも得/.test(res), '結果：最後の問いへの自分の答え');
  if (SHOTS) await page.screenshot({ path: SHOTS + 'results.png', fullPage: true });

  /* ---------- 自習モード（入門・途中で離脱→再開） ---------- */
  section('自習モード（入門）の再開');
  await page.goto(BASE + '#/study?course=intro&len=15');
  await page.locator('.study-nav button:has-text("次へ")').click();
  await page.reload();
  ok(await page.locator('button:has-text("続きから")').count() === 1, '再読み込み → 「続きから」を表示');
  await page.click('button:has-text("続きから")');
  ok(await page.locator('.step-title').innerText() === '予想する', '続きから → ステップ2に戻る');

  /* ---------- 演習問題 ---------- */
  section('演習問題（入門10問・課題リンク）');
  await page.goto(BASE + '#/practice?d=intro&n=10&seed=4242&start=1');
  await page.waitForSelector('.qview');
  const firstPrompt = await page.locator('.prompt').innerText();
  guard = 0;
  while (await page.locator('.qview').count() && guard++ < 30) {
    await solveCurrent(page);
    const qNum = await page.locator('.q-num').innerText();
    if (guard === 2) { // 類題
      const sim = page.locator('button:has-text("にた問題でもう一度")');
      if (await sim.count()) { await sim.click(); ok(await page.locator('.tag.sim').count() === 1, 'にた問題でもう一度 → 問題が追加される'); continue; }
    }
    await page.locator('.quiz .next-row .btn-primary').click();
  }
  await page.waitForSelector('.page-results');
  ok(/演習問題（入門）/.test(await page.locator('.result-title').innerText()), '10問解いて結果画面へ');
  await page.goto(BASE + '#/practice?d=intro&n=10&seed=4242&start=1');
  await page.waitForSelector('.qview');
  ok(await page.locator('.prompt').innerText() === firstPrompt, '同じリンク（問題番号）なら同じ問題');
  if (SHOTS) await page.screenshot({ path: SHOTS + 'practice-q.png', fullPage: true });

  /* ---------- 印刷 ---------- */
  section('A4プリント（問題と解答を別々に）');
  await page.goto(BASE + '#/practice');
  await page.locator('button:has-text("破棄する")').click().catch(() => {});
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('label[for=diff-standard]');
  await page.click('button:has-text("問題プリントを印刷")');
  let sheet = await page.locator('#print-root').innerText();
  ok(/演習プリント（問題）/.test(sheet) && (sheet.match(/問\d+/g) || []).length === 5 && !/答え：/.test(sheet), '問題プリント：5問、答えを含まない');
  if (SHOTS) { await page.evaluate(() => document.body.classList.add('print-sheet')); await page.pdf({ path: SHOTS + 'sheet-problems.pdf', format: 'A4' }); }
  await page.click('button:has-text("解答・解説を印刷")');
  sheet = await page.locator('#print-root').innerText();
  ok(/演習プリント（解答・解説）/.test(sheet) && (sheet.match(/答え：/g) || []).length === 5, '解答プリント：5問ぶんの答えと解説');
  if (SHOTS) { await page.evaluate(() => document.body.classList.add('print-sheet')); await page.pdf({ path: SHOTS + 'sheet-answers.pdf', format: 'A4' }); }


  /* ---------- 今回直した不具合の再発防止 ---------- */
  section('入力まわりの不具合修正');
  await page.goto(BASE + '#/practice?d=standard&n=3&seed=777&start=1');
  await page.waitForSelector('.qview');
  // 数値問題が出るまで進める
  let g2 = 0;
  while (!(await page.locator('.num-input').count()) && g2++ < 10) {
    await solveCurrent(page); await page.locator('.quiz .next-row .btn-primary').click();
    if (await page.locator('.page-results').count()) { await page.goto(BASE + '#/practice?d=standard&n=10&seed=778&start=1'); await page.waitForSelector('.qview'); }
  }
  ok(await page.locator('.num-input').count() === 1, '数値入力の問題を表示');
  await page.locator('.num-input').fill('0');
  await page.$eval('.num-input', el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, keyCode: 229, bubbles: true })));
  ok(await page.locator('.feedback.wrong, .feedback.right, .feedback.reveal').count() === 0, '日本語入力の確定Enterでは採点しない');
  await page.locator('.num-input').fill('2');
  await page.click('button:has-text(\"分数の「/」\")');
  ok(await page.locator('.num-input').inputValue() === '2/', '「/」ボタンで分数の線を入れられる');
  await page.goto(BASE + '#/practice');
  await page.locator('button:has-text(\"破棄する\")').click().catch(() => {});
  await page.fill('#seed', '１２３４５');
  ok(/seed=12345&/.test(await page.locator('.field input[readonly]').inputValue()), '問題番号に全角数字を入れても使える');
  await page.goto(BASE + '#/sim');
  await page.focus('.skip'); await page.keyboard.press('Enter');
  ok(/#\/sim$/.test(page.url()) && await page.locator('.page-sim').count() === 1, '「本文へスキップ」で画面が変わらない');
  await page.goto(BASE + '#/');

  /* ---------- 先生用：課題・プリントをつくる ---------- */
  section('先生用：課題・プリントをつくる（難易度＋ボタン1つ）');
  await page.goto(BASE + '#/');
  ok(await page.locator('#teacher a:has-text("課題・プリントをつくる")').isVisible(), 'トップに「課題・プリントをつくる」が折りたたまれずに見える');
  await page.click('.usage-bar');
  await page.waitForSelector('.page-teacher');
  ok(true, '「授業での使い方」の帯から先生用ページへ');
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('.level-btn:has-text("入門")');
  ok(await page.locator('.level-btn.on').innerText().then(t => /入門/.test(t)), '難易度「入門」を選べる');
  await page.click('button:has-text("自習課題をつくる")');
  const studyLink = await page.locator('.link-input').inputValue();
  ok(/#\/study\?course=intro&len=30$/.test(studyLink), 'ボタン1回で自習課題のリンク（入門・30分）', studyLink);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok(clip === studyLink, '↑ リンクが自動でコピーされている', clip);
  await page.click('button:has-text("短い版（約15分）にする")');
  ok(/len=15$/.test(await page.locator('.link-input').inputValue()), '短い版（15分）に切りかえられる');
  // 配られたリンクを開くと、そのコースからすぐ始まる
  const p2 = await ctx.newPage();
  await p2.goto(studyLink.replace(/^.*#/, BASE + '#'));
  await p2.evaluate(() => localStorage.removeItem('trade-sim.study'));
  await p2.reload();
  ok(/入門コース/.test(await p2.locator('.study-progress').innerText()), '↑ そのリンクを開くと入門コースがすぐ始まる');
  await p2.close();
  await page.click('.level-btn:has-text("標準")');
  await page.click('button:has-text("演習プリントをつくる")');
  ok(/演習プリント（標準・10問）を作りました/.test(await page.locator('.result-card').innerText()), 'ボタン1回で演習プリント（標準・10問）');
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('.result-card button:has-text("問題プリントを印刷")');
  let ts = await page.locator('#print-root').innerText();
  ok((ts.match(/問\d+/g) || []).length === 10 && !/答え：/.test(ts), '↑ 問題プリント10問（答えなし）');
  const seedShown = (await page.locator('.result-head').innerText()).match(/問題番号 (\d+)/)[1];
  ok(ts.includes('問題番号 ' + seedShown), '↑ プリントと画面の問題番号が一致');
  await page.click('.result-card button:has-text("解答・解説を印刷")');
  ts = await page.locator('#print-root').innerText();
  ok((ts.match(/答え：/g) || []).length === 10, '↑ 解答・解説10問');
  await page.click('.result-card button:has-text("20問")');
  ok(/標準・20問/.test(await page.locator('.result-card').innerText()) && (await page.locator('.result-head').innerText()).includes(seedShown), '問題数を20問に変えられる（同じ問題番号）');
  await page.click('.result-card button:has-text("リンクをコピー")');
  const clip2 = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok(new RegExp('#/practice\\?d=standard&n=20&seed=' + seedShown + '&start=1$').test(clip2), '同じ問題を画面で解くリンクをコピー', clip2);
  const jargon = [];
  for (const r of ['#/', '#/sim', '#/practice', '#/study', '#/howto', '#/teacher']) {
    await page.goto(BASE + r); await page.waitForTimeout(100);
    await page.$$eval('details', ds => ds.forEach(d => d.open = true));
    const txt = await page.evaluate(() => document.getElementById('app').innerText);
    for (const w of ['JSON', 'localStorage', 'プリセット', '検算', 'シード', '基準（均等）', '類題', 'P01']) if (txt.includes(w)) jargon.push(r + ':' + w);
  }
  ok(jargon.length === 0, '画面に専門用語・開発用語が残っていない', jargon);

  /* ---------- マニュアル ---------- */
  section('使い方・マニュアル');
  await page.goto(BASE + '#/');
  await page.click('.hero-actions a:has-text("使い方")');
  await page.waitForSelector('.manual');
  ok(await page.locator('.tab').count() === 2, '生徒向け・先生向けの2つのタブ');
  ok(await page.locator('.manual-student .man-step').count() >= 10, '生徒向けてびきの手順を表示', await page.locator('.man-step').count());
  const imgsOk = await page.$$eval('.manual img', ims => Promise.all(ims.map(im => im.complete ? im : new Promise(r => { im.onload = im.onerror = () => r(im); })))
    .then(list => list.every(im => im.naturalWidth > 0)));
  ok(imgsOk, 'マニュアルの画面写真がすべて表示される');
  await page.click('.tab:has-text("先生向けマニュアル")');
  ok(/for=teacher/.test(page.url()) && await page.locator('.manual-teacher').count() === 1, '先生向けタブに切りかわる（URLも変わる）');
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('button:has-text("このマニュアルを印刷・PDFで保存")');
  await page.waitForTimeout(500);
  const ms = await page.locator('#print-root').innerText();
  ok(/先生向けマニュアル/.test(ms) && /自習課題・演習プリントをつくる/.test(ms) && /提出の受け取り方/.test(ms), '印刷用のマニュアルが用意される');
  await page.goto(BASE + '#/howto?for=student');
  ok(await page.locator('.manual-student').count() === 1, 'リンク（?for=student）で生徒向けを直接開ける');

  /* ---------- ChatGPT検品の指摘に対する修正の確認 ---------- */
  section('検品指摘の修正（所要時間・課題の再開・コピー失敗・問題数）');
  // B1：目安時間の合計が「約15分／約30分」と一致
  const minuteSums = await page.evaluate(() => [['intro', 15], ['standard', 15], ['intro', 30], ['standard', 30]].map(([c, l]) =>
    TS.studyPlan.stepsFor({ course: c, len: l }).reduce((a, s) => a + s.min, 0) + '/' + l));
  ok(minuteSums.every(x => x.split('/')[0] === x.split('/')[1]), '自習の目安時間の合計が15分・30分と一致', minuteSums);
  for (const [c, l] of [['intro', 15], ['standard', 30]]) {
    await page.goto(BASE + '#/');
    await page.evaluate(() => localStorage.removeItem('trade-sim.study'));
    await page.goto(BASE + '#/study?course=' + c + '&len=' + l);
    ok(new RegExp('のこり約' + l + '分').test(await page.locator('.study-progress').innerText()), '↑ ' + c + '・' + l + '分版の開始時「のこり約' + l + '分」');
  }
  // B2：同じ問題番号でも、問題数がちがう課題リンクは別の課題として始まる
  await page.evaluate(() => localStorage.removeItem('trade-sim.quiz'));
  await page.goto(BASE + '#/practice?d=intro&n=5&seed=12345&start=1');
  await page.waitForSelector('.qview');
  await solveCurrent(page); await page.locator('.quiz .next-row .btn-primary').click();
  ok(/問題 2 \/ 5/.test(await page.locator('.q-num').innerText()), '5問の課題を2問目まで進める');
  await page.goto(BASE + '#/practice?d=intro&n=10&seed=12345&start=1');
  await page.waitForSelector('.qview');
  ok(/問題 1 \/ 10/.test(await page.locator('.q-num').innerText()), '問題数がちがうリンク → 新しい10問の課題として始まる', await page.locator('.q-num').innerText());
  await solveCurrent(page); await page.locator('.quiz .next-row .btn-primary').click();
  await page.goto(BASE + '#/practice?d=intro&n=10&seed=12345&start=1');
  await page.waitForSelector('.qview');
  ok(/問題 2 \/ 10/.test(await page.locator('.q-num').innerText()), 'まったく同じリンクを開き直す → 続きから', await page.locator('.q-num').innerText());
  // B3：コピーできない端末では「コピーしました」と言わない
  const noclip = await browser.newContext();
  await noclip.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { get() { return { writeText() { return Promise.reject(new Error('denied')); } }; } });
    document.execCommand = () => false;
  });
  const nc = await noclip.newPage();
  await nc.goto(BASE + '#/teacher');
  await nc.click('button:has-text("自習課題をつくる")');
  await nc.waitForFunction(() => !/用意しています/.test(document.querySelector('.result-head').innerText));
  const headTxt = await nc.locator('.result-head').innerText();
  ok(!/コピーしました/.test(headTxt) && /できませんでした/.test(headTxt), 'コピー失敗時は「コピーしました」と表示しない', headTxt);
  ok(/長押し/.test(await nc.locator('.result-card').innerText()) && /#\/study\?course=standard&len=30$/.test(await nc.locator('.link-input').inputValue()), '↑ 手でコピーする方法とリンクを表示');
  await noclip.close();
  const okHead = await (async () => { await page.goto(BASE + '#/teacher'); await page.click('button:has-text("自習課題をつくる")'); await page.waitForFunction(() => !/用意しています/.test(document.querySelector('.result-head').innerText)); return page.locator('.result-head').innerText(); })();
  ok(/コピーしました/.test(okHead), 'コピー成功時は「コピーしました」', okHead);
  // A2：固定例題で作れる数が足りないときは、理由を表示
  await page.goto(BASE + '#/');
  await page.evaluate(() => localStorage.setItem('trade-sim.scenario', JSON.stringify({ title: '同率', description: '', kind: 'countries', tableType: 'output', producers: ['A国', 'B国'], goods: ['商品A', '商品B'], table: [[10, 5], [6, 3]], labor: [1, 1] })));
  await page.goto(BASE + '#/practice');
  await page.locator('button:has-text("破棄する")').click().catch(() => {});
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('label[for=diff-intro]'); await page.click('label[for=count-20]'); await page.click('label[for=src-scenario]');
  await page.click('button:has-text("問題プリントを印刷")');
  const pq = ((await page.locator('#print-root').innerText()).match(/問\d+/g) || []).length;
  ok(pq === 13 && /13問でした/.test(await page.locator('.setup .warn').innerText()), '同率の表で入門20問 → 作れる13問で作り、理由を表示', pq);
  await page.click('label[for=count-10]');
  await page.click('button:has-text("問題プリントを印刷")');
  ok(((await page.locator('#print-root').innerText()).match(/問\d+/g) || []).length === 10, '↑ 10問ならそろう');
  await page.evaluate(() => localStorage.removeItem('trade-sim.scenario'));

  /* ---------- 再検品（v2）の指摘 C2：別の自習課題リンク ---------- */
  section('別の自習課題のリンクを開いたとき');
  await page.goto(BASE + '#/');
  await page.evaluate(() => localStorage.removeItem('trade-sim.study'));
  await page.goto(BASE + '#/study?course=intro&len=15');
  await page.locator('.study-nav button:has-text("次へ")').click();
  await page.locator('.choice').first().click(); await page.locator('.choice').nth(3).click();
  await page.locator('.study-nav button:has-text("次へ")').click();
  ok(await page.locator('.step-title').innerText() === '表を読む（絶対優位）', '入門15分をステップ3まで進める');
  await page.goto(BASE + '#/study?course=standard&len=30');
  ok(/別の自習課題のリンク/.test(await page.locator('.other-task').innerText()), '別のコース・時間のリンク → 「別の課題」と案内');
  ok(await page.locator('button:has-text("新しい課題を始める（標準コース・約30分）")').count() === 1 && await page.locator('button:has-text("前の続きに戻る（入門コース・約15分）")').count() === 1, '↑ 新しい課題／前の続き を選べる');
  await page.click('button:has-text("前の続きに戻る")');
  ok(await page.locator('.step-title').innerText() === '表を読む（絶対優位）', '「前の続き」→ 前の記録が残っていて続きから');
  await page.goto(BASE + '#/study?course=intro&len=30');
  ok(await page.locator('.other-task').count() === 1, '同じコースでも時間がちがえば別の課題として案内');
  await page.click('button:has-text("新しい課題を始める")');
  ok(/入門コース・のこり約30分/.test(await page.locator('.study-progress').innerText()) && await page.locator('.step-title').innerText() === '今日のゴール', '「新しい課題」→ 入門30分を最初から');
  await page.goto(BASE + '#/study?course=intro&len=30');
  ok(await page.locator('.other-task').count() === 0, 'まったく同じリンクを開き直しても「別の課題」とは言わない');
  await page.evaluate(() => localStorage.removeItem('trade-sim.study'));

  /* ---------- スマホ幅 ---------- */
  section('スマホ幅で崩れない');
  const phone = await browser.newPage({ viewport: { width: 375, height: 740 } });
  phone.on('pageerror', e => errors.push('PAGEERROR(phone) ' + e.message));
  for (const r of ['#/', '#/sim', '#/practice', '#/study', '#/results', '#/howto', '#/teacher']) {
    await phone.goto(BASE + r);
    await phone.waitForTimeout(150);
    const over = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 0, r + '：横スクロールなし', over);
  }
  const small = await phone.$$eval('button:not(.hidden), a.btn, .choice, select, input:not([type=checkbox]):not([type=radio])', els =>
    els.filter(e => e.offsetParent && e.getBoundingClientRect().height < 43.5).map(e => e.textContent.trim().slice(0, 12) || e.tagName));
  ok(small.length === 0, 'タップ領域が44px以上', small);

  section('コンソール');
  ok(errors.length === 0, 'エラー・例外なし', errors);
  await browser.close();
  console.log('\n結果: ' + pass + ' 件成功, ' + fail + ' 件失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
