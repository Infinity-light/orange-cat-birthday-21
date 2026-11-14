// 给生图当构图参考的旧版截图（去掉界面层）：node tools/refshots.mjs
import { open, BASE, sleep } from './pw.mjs';
const { browser, page } = await open({ viewport: { width: 390, height: 844 } });
const hintHas = (t) => page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, t, { timeout: 60000 });
const clean = async (name, hideCat = true) => { await page.addStyleTag({ content: `#ui{visibility:hidden!important}${hideCat ? '.cat{visibility:hidden!important}' : ''}` }); await sleep(200); await page.screenshot({ path: `ref-old/${name}.png` }); };
for (const [act, word, ms, name] of [[2, '抽出来', 600, 'a2'], [5, '货架', 400, 'a5'], [6, '刮开', 400, 'a6'], [3, '往左拉', 400, 'a3']]) {
  await page.goto(BASE + '/index.html?act=' + act); await hintHas(word); await sleep(ms); await clean(name);
}
await page.goto(BASE + '/index.html?act=7'); await hintHas('灯'); await page.click('.hint-alt'); await hintHas('蜡烛'); await page.click('.hint-alt');
await page.waitForSelector('.a7-actions:not([hidden])', { timeout: 60000 }); await sleep(800);
await page.evaluate(() => { document.querySelector('.a7-final').style.display = 'none'; document.querySelector('.a7-actions').style.display = 'none'; const z = document.querySelector('.a7-zzz'); if (z) z.remove(); });
await clean('a7');
// 第四幕整张地图
await page.goto(BASE + '/index.html?act=4'); await sleep(3500);
await page.evaluate(() => { const w = document.querySelector('.a4-world'); document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;overflow:auto;background:#ecdfc2'; w.style.transform = 'none'; w.style.position = 'relative'; document.body.appendChild(w); document.documentElement.style.overflow = 'auto'; document.body.style.height = 'auto'; const c = w.querySelector('.cat'); if (c) c.remove(); });
await page.setViewportSize({ width: 760, height: 1130 }); await sleep(300); await page.screenshot({ path: 'ref-old/a4-map.png' });
await browser.close();
