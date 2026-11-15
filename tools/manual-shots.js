/*
 * マニュアル用の画面写真を撮り直す（Playwright）
 *   1) python3 -m http.server 8123
 *   2) node tools/manual-shots.js
 * → img/manual/*.jpg が更新されます。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8123/index.html';
const OUT = path.join(__dirname, '..', 'img', 'manual');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1.5 });
  const hideToast = () => page.addStyleTag({ content: '.toast{display:none!important} .study-nav,.study-progress{position:static!important} *{transition:none!important}' });
  const shot = async (sel, file) => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 80 });
    console.log('  ' + file);
  };

  await page.goto(BASE + '#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await hideToast();
  await shot('.hero', 'top.jpg');
  await shot('#example .panel', 'example.jpg');
  await page.goto(BASE + '#/teacher'); await hideToast();
  await page.click('.level-btn:has-text("入門")');
  await shot('.page-teacher', 'teacher.jpg');
  await page.click('button:has-text("演習プリントをつくる")');
  await shot('.result-card', 'sheet.jpg');

  await page.goto(BASE + '#/study'); await hideToast();
  await shot('.study .panel', 'course.jpg');
  await page.click('button:has-text("標準コース")');
  const next = page.locator('.study-nav button:has-text("次へ")');
  await next.click();
  await page.locator('.choice:has-text("ある")').first().click();
  await page.locator('.choice:has-text("商品A")').click();
  await next.click();
  await page.locator('.choice:has-text("Bさん")').click();
  await shot('.q-panel', 'hint.jpg');

  await page.goto(BASE + '#/practice?d=intro&n=3&seed=2468&start=1'); await hideToast();
  for (let k = 0; k < 3; k++) {
    const q = page.locator('.qview');
    const n = await q.locator('.choice').count();
    for (let i = 0; i < n; i++) {
      const b = q.locator('.choice').nth(i);
      if (await b.isDisabled()) continue;
      await b.click();
      if (await q.locator('.feedback.right, .feedback.reveal').count()) break;
    }
    await page.locator('.quiz .next-row .btn-primary').click();
  }
  await page.waitForSelector('.result-panel');
  await shot('.result-panel', 'results.jpg');


  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
