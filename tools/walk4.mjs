import { open, BASE, sleep } from './pw.mjs';
const H = +process.env.VH || 844;
const { browser, page, errors } = await open({ viewport: { width: 390, height: H } });
const T = process.env.TAG || 'r1';
const shot = (n) => page.screenshot({ path: `shots/${T}-a4-${n}.png` });
const hintHas = (t) => page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, t, { timeout: 30000 });
await page.goto(BASE + '/index.html?act=4'); await sleep(1500);
await shot('0-start');
const words = ['台灯', '店门', '树叶', '发车牌'];
for (let i = 0; i < 4; i++) {
  await hintHas(words[i]); await sleep(300); await shot(`${i + 1}a-arrive`);
  if (i === 2) { // 真实拖动树叶
    const b = await (await page.$('.a4-hit.explore')).boundingBox();
    await page.mouse.move(b.x + 34, b.y + 34); await page.mouse.down(); await page.mouse.move(b.x + 90, b.y + 20, { steps: 8 }); await page.mouse.up();
  } else await page.click('.a4-hit.explore');
  await hintHas('点开'); await sleep(400); await shot(`${i + 1}b-explored`);
  await page.click('.a4-hit.record:not(.seen)', { force: true }); await sleep(900); await shot(`${i + 1}c-reader`);
  await page.click('.reader-close'); await sleep(700);
  if (i === 1) { await page.click('.a4-dots button[data-i="0"]'); await sleep(700); await shot('2d-revisit'); await page.click('.reader-close'); await sleep(500); }
  await page.click('.cta');
}
await sleep(3000); await shot('5-night');
await hintHas('推门'); await sleep(300); await shot('6-door');
await page.click('.a4-hit.explore'); await sleep(900); await shot('7-open'); await sleep(900); await shot('8-zoom'); await sleep(1500); await shot('9-act5');
console.log(errors.join('\n') || 'no errors');
await browser.close();
