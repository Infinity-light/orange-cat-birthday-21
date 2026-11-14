// node tools/one.mjs <act> <hint词> <延时ms> <输出名>   等某个提示出现后截一张
import { open, BASE, sleep } from './pw.mjs';
const [act, word, ms, name] = process.argv.slice(2);
const { browser, page, errors } = await open({ viewport: { width: +process.env.VW || 390, height: +process.env.VH || 844 } });
await page.goto(BASE + '/index.html?act=' + act);
await page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, word, { timeout: 60000 });
await sleep(+ms); await page.screenshot({ path: `shots/${name}.png` });
console.log(errors.join('\n') || 'ok'); await browser.close();
