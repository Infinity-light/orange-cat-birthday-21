// 第一幕分步截图：node tools/a1-shots.mjs [tag]
import { open, BASE, sleep } from './pw.mjs';
const T = process.argv[2] || 'a1', W = +process.env.VW || 390, H = +process.env.VH || 844;
const { browser, page, errors } = await open({ viewport: { width: W, height: H } });
const shot = (n) => page.screenshot({ path: `shots/${T}-${n}.png` });
const hintHas = (t, timeout = 40000) => page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, t, { timeout });
await page.goto(BASE + '/index.html'); await sleep(1800); await shot('0-intro');
await page.click('[data-s="0"]'); await hintHas('封条'); await sleep(500); await shot('1-closed');
// 真手势撕到一半
const tab = await page.$('.a1-tab'); const b = await tab.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
await page.touchscreen.tap(x, y).catch(() => {});
const cdp = await page.context().newCDPSession(page);
const touch = async (type, px, py) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py }] });
await touch('touchStart', x, y);
for (let i = 1; i <= 12; i++) { await touch('touchMove', x + i * 0.3, y + i * 9); await sleep(30); }
await sleep(300); await shot('2-half');
for (let i = 13; i <= 30; i++) { await touch('touchMove', x + 4, y + i * 9); await sleep(30); }
await touch('touchEnd'); await sleep(700); await shot('3-torn');
await hintHas('爪子'); await sleep(600); await shot('4-peek');
await page.click('.hint-alt'); await sleep(1250); await shot('5-jump');
await page.waitForSelector('.cta:not([hidden])', { timeout: 40000 }); await sleep(400); await shot('6-out');
await page.click('.cta'); await sleep(1300); await shot('7-carry');
console.log(errors.join('\n') || 'ok'); await browser.close();
