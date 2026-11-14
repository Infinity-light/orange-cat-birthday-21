// 抓小猫与物件接触的瞬间（踩快门、拉胶卷、拍车票、推门、接卡片、压卡片角），用来自评动作衔接
import { open, BASE, sleep } from './pw.mjs';
const { browser, page, errors } = await open({});
const T = process.env.TAG || 'ct';
const shot = (n) => page.screenshot({ path: `shots/${T}-${n}.png` });
const hintHas = (t, timeout = 60000) => page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, t, { timeout });
// 第二幕：踩快门
await page.goto(BASE + '/index.html?act=2'); await hintHas('快门'); await sleep(450); await shot('a2-jump'); await sleep(520); await shot('a2-press');
// 第二幕：拉胶卷（跳过三张照片）
for (let i = 0; i < 3; i++) { await hintHas('抽出来'); await page.click('.hint-alt'); await page.waitForSelector('[data-a=flip]:not([hidden])'); if (i === 2) { await page.click('[data-a=flip]'); await sleep(800); } await page.click('[data-a=keep]'); }
await sleep(3600); await shot('a2-filmreach'); await sleep(1500); await shot('a2-filmpull');
// 第三幕：车票
await page.evaluate(() => { const S = window.__app.Store.data; S.sub.a3 = 4; window.__app.jumpTo(2); });
await hintHas('便签'); await page.click('.hint-alt'); await sleep(1500); await page.click('.hint-alt'); await sleep(2600); await shot('a3-ticketpat'); await sleep(1500); await shot('a3-ticket');
// 第四幕：推门
await page.evaluate(() => { window.__app.Store.data.sub.a4 = 3; window.__app.jumpTo(3); });
await hintHas('发车牌'); await page.click('.hint-alt'); await hintHas('点开'); await page.click('.hint-alt'); await sleep(600); await page.click('.reader-close'); await page.waitForSelector('.cta:not([hidden])'); await sleep(300); await page.click('.cta');
await hintHas('推门'); await sleep(400); await shot('a4-push');
// 第五幕：接卡片、推卡片
await page.evaluate(() => window.__app.jumpTo(4));
await hintHas('货架'); await page.click('.hint-alt'); await hintHas('摇杆'); await page.click('.hint-alt');
await page.waitForSelector('[data-a=take]', { state: 'visible' }); await sleep(300); await page.click('[data-a=take]');
await sleep(1900); await shot('a5-catch'); await sleep(900); await shot('a5-pull'); await sleep(900); await shot('a5-push');
// 第六幕：压卡片角
await page.evaluate(() => window.__app.jumpTo(5)); await hintHas('刮开'); await sleep(300); await shot('a6-paw');
console.log(errors.join('\n') || 'no errors'); await browser.close();
