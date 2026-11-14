import { open, BASE, sleep } from './pw.mjs';
const H = +process.env.VH || 844;
const { browser, page, errors } = await open({ viewport: { width: 390, height: H } });
const T = process.env.TAG || 'r1';
const shot = (n) => page.screenshot({ path: `shots/${T}-a2-${n}.png` });
await page.goto(BASE + '/index.html?act=2'); await sleep(4200);
await shot('0-shutter');
for (let i = 0; i < 3; i++) {
  await page.waitForFunction(() => document.querySelector('.hint-alt') && !document.querySelector('.hint-alt').hidden && document.querySelector('.hint-text').textContent.includes('抽'), null, { timeout: 15000 });
  if (i === 0) {
    await shot('1-ejected');
    const b = await (await page.$('.a2-slot')).boundingBox();
    await page.mouse.move(b.x + 60, b.y + 20); await page.mouse.down();
    for (let k = 1; k <= 10; k++) { await page.mouse.move(b.x + 60, b.y + 20 + k * 10, { steps: 2 }); await sleep(30); }
    await page.mouse.up();
  } else await page.click('.hint-alt');
  await sleep(1500); if (i === 0) await shot('2-developing');
  await page.waitForSelector('[data-a=flip]:not([hidden])', { timeout: 15000 });
  await sleep(300); if (i === 0) await shot('3-developed');
  if (i === 0) { await page.click('.hot'); await sleep(600); await shot('4-hot'); await page.click('.a2-note button'); }
  await page.click('[data-a=flip]'); await sleep(1000); if (i === 0 || i === 2) await shot('5-back' + i);
  await page.click('[data-a=keep]'); await sleep(1200); if (i === 0) await shot('6-kept');
}
await sleep(1500); await shot('7-film1'); await sleep(3500); await shot('8-film2');
await page.waitForFunction(() => document.querySelector('.hint-text').textContent.includes('胶卷'), null, { timeout: 15000 });
await shot('9-filmready');
await page.click('.hint-alt'); await sleep(500); await shot('10-zoom'); await sleep(1500); await shot('11-act3');
console.log(errors.join('\n') || 'no errors');
await browser.close();
