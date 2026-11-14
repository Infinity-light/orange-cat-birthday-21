import { open, BASE, sleep } from './pw.mjs';
const H = +process.env.VH || 844;
const { browser, page, errors } = await open({ viewport: { width: 390, height: H } });
const T = process.env.TAG || 'r1';
const shot = (n) => page.screenshot({ path: `shots/${T}-a3-${n}.png` });
const swipe = async (dx, y = H * 0.38) => {
  await page.mouse.move(300, y); await page.mouse.down();
  for (let k = 1; k <= 10; k++) { await page.mouse.move(300 + dx * k / 10, y, { steps: 2 }); await sleep(25); }
  await page.mouse.up();
};
await page.goto(BASE + '/index.html?act=3'); await sleep(1800);
await shot('0-start');
await swipe(-200); await sleep(1500); await shot('1-node1');
await swipe(-200); await sleep(1500); await shot('2-node2-fog');
// 擦雾
const fog = await (await page.$('.a3-fog')).boundingBox();
await page.mouse.move(fog.x + 20, fog.y + 30); await page.mouse.down();
for (let r = 0; r < 5; r++) { await page.mouse.move(fog.x + fog.width - 20, fog.y + 30 + r * 40, { steps: 6 }); await page.mouse.move(fog.x + 20, fog.y + 50 + r * 40, { steps: 6 }); if (r === 1) await shot('3-wiping'); }
await page.mouse.up(); await sleep(1600); await shot('4-fogdone');
await swipe(-200); await sleep(1500); await shot('5-node3-find');
await page.click('.a3-items button[data-i="1"]'); await sleep(900); await shot('6-wrong');
await page.click('.a3-items button[data-i="0"]'); await sleep(1500); await shot('7-right');
await swipe(-200); await sleep(1500); await shot('8-node4');
await swipe(-200); await sleep(1500); await shot('9-node5-note');
await page.click('.a3-folded'); await sleep(1500); await shot('10-noteopen');
await swipe(200); await sleep(1300); await shot('11-back');
await swipe(-200); await sleep(1300);
await swipe(-200); await sleep(4200); await shot('12-ticket');
await page.click('.a3-ticket'); await sleep(2300); await shot('13-ticketopen');
await sleep(2400); await shot('14-act4');
console.log(errors.join('\n') || 'no errors');
await browser.close();
