// 从第一幕连续走到第七幕（主要走「替代按钮」路径），验证七幕之间的转场和整条动线。
// 用法：BASE=https://xxx ENGINE=webkit VW=390 VH=844 TAG=uat node tools/walk-all.mjs
import { open, BASE, sleep } from './pw.mjs';
const W = +process.env.VW || 390, H = +process.env.VH || 844, T = process.env.TAG || 'all', engine = process.env.ENGINE || 'chromium';
const { browser, page, errors } = await open({ viewport: { width: W, height: H }, engine, ua: process.env.UA || undefined, mobile: process.env.DESKTOP ? false : undefined, touch: process.env.DESKTOP ? false : undefined, video: process.env.VIDEO ? 'shots/_video' : undefined });
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const t0 = Date.now();
const shot = (n) => page.screenshot({ path: `shots/${T}-${n}.png` }).catch(() => {});
const hintText = () => page.evaluate(() => { const e = document.querySelector('.hint'); return e && !e.hidden ? e.textContent : ''; });
const altWhen = async (word, timeout = 40000) => {
  await page.waitForFunction((w) => { const e = document.querySelector('.hint'); const b = document.querySelector('.hint-alt'); return e && !e.hidden && b && !b.hidden && e.textContent.includes(w); }, word, { timeout });
  await sleep(250); await page.click('.hint-alt');
};
const cta = async (timeout = 40000) => { await page.waitForSelector('.cta:not([hidden])', { timeout }); await sleep(350); await page.click('.cta'); };
const act = () => page.evaluate(() => window.__app.current && window.__app.current.i + 1);
const waitAct = (n, timeout = 20000) => page.waitForFunction((n) => window.__app.current && window.__app.current.i + 1 === n, n, { timeout });

await page.goto(BASE + '/index.html' + (process.env.Q || '')); await sleep(1500);
await shot('a1-0');
await page.click('[data-s="0"]');
await altWhen('封条'); await sleep(2600); await shot('a1-1');
await altWhen('爪子'); await cta(); log('act1 done');
await waitAct(2); await sleep(600);
for (let i = 0; i < 3; i++) {
  await altWhen('抽出来');
  await page.waitForSelector('[data-a=flip]:not([hidden])', { timeout: 20000 });
  if (i === 2) { await page.click('[data-a=flip]'); await sleep(900); }
  await page.click('[data-a=keep]');
}
await altWhen('胶卷'); log('act2 done');
await waitAct(3); await sleep(800); await shot('a3-0');
for (let guard = 0; guard < 60; guard++) {
  if (await page.$('.a3-ticket')) break;
  const t = await hintText();
  const items = await page.$('.a3-inter:not(.done) .a3-items button[data-i="0"]');
  if (t.includes('擦') || t.includes('便签')) await page.click('.hint-alt');
  else if (items) await items.click();
  else if (t.includes('拉')) await page.click('.hint-alt');
  await sleep(1100);
}
await altWhen('车票'); log('act3 done');
await waitAct(4, 30000); await sleep(600);
for (const w of ['台灯', '店门', '树叶', '发车牌']) {
  await altWhen(w, 60000); await altWhen('点开'); await sleep(700); await page.click('.reader-close'); await cta();
}
await altWhen('推门', 60000); log('act4 done');
await waitAct(5); await sleep(1500); await shot('a5-0');
await altWhen('货架'); await altWhen('摇杆');
await page.waitForSelector('[data-a=take]', { state: 'visible', timeout: 20000 }); await sleep(400); await page.click('[data-a=take]');
await altWhen('卡片'); log('act5 done');
await waitAct(6); await sleep(1000);
await altWhen('刮开'); await sleep(1500); await shot('a6-1');
for (let i = 0; i < 6; i++) { await cta(); await sleep(500); }
await altWhen('暖光', 60000); log('act6 done');
await waitAct(7); await sleep(1500);
await altWhen('灯'); await altWhen('蜡烛', 60000);
await page.waitForSelector('.a7-actions:not([hidden])', { timeout: 60000 }); await sleep(1800); await shot('a7-end');
// 回忆册 / 纪念卡 / 目录
await page.click('[data-a=album]'); await sleep(700); await shot('album'); await page.click('.al-close'); await sleep(500);
await page.click('[data-a=card]'); await page.waitForSelector('.keep-img img, .keep-img canvas', { timeout: 20000 }); await sleep(500); await shot('keepsake');
await page.click('.keep button'); await sleep(300);
await page.click('#btn-menu'); await sleep(500); await shot('menu');
const saved = await page.evaluate(() => JSON.stringify(window.__app.Store.data));
log('store', saved);
// 进度保存：刷新后应提示接着看
await page.click('[data-a=close]');
await page.reload(); await sleep(1500); await shot('resume');
const resume = await page.evaluate(() => !!document.querySelector('[data-r=go]'));
log('resume prompt:', resume);
log('errors:', errors.filter((e) => !/favicon/.test(e)).join('\n') || 'none');
const vid = process.env.VIDEO ? page.video() : null;
await page.context().close(); await browser.close();
if (vid) { const fs = await import('node:fs'); const pth = await vid.path(); fs.copyFileSync(pth, process.env.VIDEO); fs.rmSync('shots/_video', { recursive: true, force: true }); console.log('video ->', process.env.VIDEO, fs.statSync(process.env.VIDEO).size, 'bytes'); }
