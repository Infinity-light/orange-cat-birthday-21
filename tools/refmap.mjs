import { open, BASE, sleep } from './pw.mjs';
const { browser, page } = await open({ viewport: { width: 760, height: 1130 }, dpr: 1.5, mobile: false, touch: false });
await page.goto(BASE + '/index.html?act=4'); await sleep(3500);
await page.evaluate(() => { const w = document.querySelector('.a4-world'); const svg = w.querySelector('svg.a4-map'); document.body.innerHTML = ''; document.documentElement.style.cssText = 'overflow:visible;height:auto'; document.body.style.cssText = 'margin:0;overflow:visible;height:auto;background:#ecdfc2;position:static'; svg.style.cssText = 'display:block;position:static;transform:none'; document.body.appendChild(svg); window.scrollTo(0, 0); });
await sleep(300); await page.screenshot({ path: 'ref-old/a4-map.png', fullPage: true });
await browser.close();
