// 连拍看动作：node tools/burst.mjs <act> <等哪个提示(可空)> <张数> <间隔ms> <tag> [裁切 x,y,w,h]
import { open, BASE, sleep } from './pw.mjs';
const [act, word, n, gap, tag, crop] = process.argv.slice(2);
const { browser, page, errors } = await open({ viewport: { width: 390, height: 844 }, dpr: 1.5 });
await page.goto(BASE + '/index.html?act=' + act);
if (word) await page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, word, { timeout: 60000 }); else await sleep(+process.env.PRE || 300);
if (process.env.ALT) { await sleep(200); await page.click('.hint-alt'); }
const clip = crop ? (([x, y, width, height]) => ({ x, y, width, height }))(crop.split(',').map(Number)) : undefined;
for (let i = 0; i < +n; i++) { await page.screenshot({ path: `shots/${tag}-${String(i).padStart(2, '0')}.png`, clip }); await sleep(+gap); }
console.log(errors.join('\n') || 'ok'); await browser.close();
