import { open, BASE, sleep } from './pw.mjs';
const H = +process.env.VH || 844;
const { browser, page, errors } = await open({ viewport: { width: 390, height: H } });
const shot = (n) => page.screenshot({ path: `shots/${process.env.TAG || 'r1'}-a1-${n}.png` });
await page.goto(BASE + '/index.html'); await sleep(1200);
await shot('0-intro');
await page.click('[data-s="0"]'); await sleep(1200);
await shot('1-gift');
// 真实拖动：从封条小角往下拉一半
const tab = await page.$('.a1-tab'); let b = await tab.boundingBox();
let x = b.x + b.width / 2, y = b.y + b.height / 2;
await page.mouse.move(x, y); await page.mouse.down();
for (let i = 1; i <= 12; i++) { await page.mouse.move(x + Math.sin(i) * 3, y + i * 6, { steps: 2 }); await sleep(30); }
await page.mouse.up(); await sleep(500);
await shot('2-half');
b = await (await page.$('.a1-tab')).boundingBox(); x = b.x + b.width / 2; y = b.y + b.height / 2;
await page.mouse.move(x, y); await page.mouse.down();
for (let i = 1; i <= 20; i++) { await page.mouse.move(x, y + i * 6, { steps: 2 }); await sleep(30); }
await page.mouse.up(); await sleep(700);
await shot('3-torn'); await sleep(900);
await shot('4-peek'); await sleep(1800);
await shot('5-pawsout');
const paw = await page.$('.a1-paw'); if (paw) { const pb = await paw.boundingBox(); await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2); } else console.log('no paw');
await sleep(600); await shot('6-spread'); await sleep(450); await shot('7-rip'); await sleep(500); await shot('8-jump'); await sleep(350); await shot('9-air'); await sleep(900); await shot('10-land');
await sleep(3500); await shot('11-wait');
await page.click('.cta'); await sleep(520); await shot('12a-bend'); await sleep(450); await shot('12-pan'); await sleep(600); await shot('12b-carry'); await sleep(1500); await shot('13-act2');
console.log(errors.join('\n') || 'no errors');
await browser.close();
