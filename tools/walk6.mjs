import { open, BASE, sleep } from './pw.mjs';
const H = +process.env.VH || 844;
const { browser, page, errors } = await open({ viewport: { width: 390, height: H } });
const T = process.env.TAG || 'r1';
const shot = (n) => page.screenshot({ path: `shots/${T}-a6-${n}.png` });
await page.goto(BASE + '/index.html?act=6'); await sleep(2600);
await shot('0-card');
const b = await (await page.$('.a6-coat')).boundingBox();
await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down();
for (let r = 0; r < Math.floor(b.height / 38) - 1; r++) { await page.mouse.move(b.x + b.width - 20, b.y + 30 + r * 38, { steps: 6 }); await page.mouse.move(b.x + 20, b.y + 50 + r * 38, { steps: 6 }); if (r === 2) await shot('1-scratching'); }
await page.mouse.up(); await sleep(2600); await shot('2-revealed');
await page.click('.cta'); await sleep(1300); await shot('3-note1');
await page.click('.cta'); await sleep(800); await page.click('.cta'); await sleep(800); await page.click('.cta'); await sleep(900); await shot('4-note4');
await page.click('.cta'); await sleep(2400); await shot('5-invite');
await page.click('.cta'); await sleep(1500); await shot('6-carry'); await sleep(3600); await shot('7-door');
await page.waitForSelector('.a6-doorwrap.ready', { timeout: 15000 });
await page.click('.hint-alt'); await sleep(900); await shot('8-open'); await sleep(900); await shot('9-zoom'); await sleep(1800); await shot('10-act7');
console.log(errors.join('\n') || 'no errors');
await browser.close();
