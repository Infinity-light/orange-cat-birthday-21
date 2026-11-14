// 用真实触摸事件（CDP Input.dispatchTouchEvent，单指）检查每一个拖动/滑动手势，不走替代按钮。
// 手指按真人速度移动：每步约 16ms、6~12px。
import { open, BASE, sleep } from './pw.mjs';
const H = +process.env.VH || 844;
const { browser, page, ctx, errors } = await open({ viewport: { width: 390, height: H } });
const cdp = await ctx.newCDPSession(page);
const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 12, radiusY: 12, force: 1 }] });
const swipe = async (x0, y0, x1, y1, steps = 18, hold = 0) => {
  await touch('touchStart', x0, y0); await sleep(60);
  for (let i = 1; i <= steps; i++) { await touch('touchMove', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await sleep(16); }
  if (hold) await sleep(hold);
  await touch('touchEnd', x1, y1); await sleep(80);
};
const tap = async (sel) => { const b = await (await page.waitForSelector(sel, { state: 'visible', timeout: 30000 })).boundingBox(); await touch('touchStart', b.x + b.width / 2, b.y + b.height / 2); await sleep(50); await touch('touchEnd', 0, 0); await sleep(60); };
const box = async (sel) => (await page.waitForSelector(sel, { timeout: 30000 })).boundingBox();
const res = [];
const ok = (name, v) => { res.push(`${v ? 'PASS' : 'FAIL'}  ${name}`); console.log(res[res.length - 1]); };
const hintHas = (t, timeout = 40000) => page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, t, { timeout });

// 第一幕：撕到一半松手 → 保留；再撕 → 小猫探头；点爪子
await page.goto(BASE + '/index.html'); await sleep(1200);
await tap('[data-s="0"]'); await hintHas('封条');
let b = await box('.a1-tab');
await swipe(b.x + 55, b.y + 55, b.x + 60, b.y + 55 + 70, 12);
await sleep(500);
const tip1 = await page.evaluate(() => window.__app.current.ctx.s.tipY);
await sleep(800);
const tip1b = await page.evaluate(() => window.__app.current.ctx.s.tipY);
ok(`第一幕 撕到一半松手后保留（tipY=${tip1.toFixed(0)} → ${tip1b.toFixed(0)}）`, tip1 > 40 && Math.abs(tip1 - tip1b) < 0.01);
b = await box('.a1-tab');
await swipe(b.x + 55, b.y + 55, b.x + 50, b.y + 55 + 130, 22);
await hintHas('爪子'); ok('第一幕 继续撕 → 小猫探头并等待', true);
await tap('.a1-paw'); await page.waitForSelector('.cta:not([hidden])', { timeout: 30000 }); ok('第一幕 点爪子 → 扒纸、跳出、碰落照片、回头等', true);
await sleep(400); await tap('.cta');
// 第二幕：抽照片、点小物件、滑动翻面
await hintHas('抽出来');
b = await box('.a2-slot');
await swipe(b.x + 60, b.y + 24, b.x + 62, b.y + 24 + 110, 16);
await page.waitForSelector('[data-a=flip]:not([hidden])', { timeout: 20000 }); ok('第二幕 手指抽出照片 → 显影', true);
await tap('.a2-card .hot'); await sleep(500);
ok('第二幕 点照片里的小物件 → 额外回忆', await page.evaluate(() => !document.querySelector('.a2-note').hidden));
await tap('.a2-note button');
b = await box('.a2-card');
await swipe(b.x + 240, b.y + 200, b.x + 80, b.y + 204, 12); await sleep(900);
ok('第二幕 横滑翻面', await page.evaluate(() => document.querySelector('.a2-flip').classList.contains('flipped')));
await page.evaluate(() => window.__app.jumpTo(2));
// 第三幕：拖胶卷、擦雾
await hintHas('往左拉');
const fy = H * 0.36;
await swipe(320, fy, 110, fy + 4, 16); await sleep(1500);
ok('第三幕 拖胶卷到第 1 格', await page.evaluate(() => window.__app.current.ctx.s.shown === 0));
await swipe(320, fy, 110, fy + 4, 16); await sleep(1500);
ok('第三幕 再拖到第 2 格（有雾）', await page.evaluate(() => window.__app.current.ctx.s.shown === 1));
await swipe(320, fy, 60, fy, 16); await sleep(1300);
ok('第三幕 小互动没完成时不会被带走', await page.evaluate(() => window.__app.current.ctx.s.shown === 1 || window.__app.current.ctx.s.reached === 1));
b = await box('.a3-fog');
for (let r = 0; r < 5; r++) await swipe(b.x + 14, b.y + 20 + r * 44, b.x + b.width - 14, b.y + 40 + r * 44, 12);
await sleep(1200);
ok('第三幕 手指擦雾 → 展开更多内容', await page.evaluate(() => !!window.__app.current.ctx.s.done[1]));
await swipe(120, fy, 330, fy, 16); await sleep(1300);
ok('第三幕 往回拖可以回看上一格', await page.evaluate(() => window.__app.current.ctx.s.shown === 0));
// 第四幕：拖树叶（从第三站恢复）
await page.evaluate(() => { window.__app.Store.data.sub.a4 = 2; window.__app.jumpTo(3); });
await hintHas('树叶', 60000);
b = await box('.a4-hit.explore');
await swipe(b.x + 34, b.y + 34, b.x + 100, b.y + 20, 12);
await hintHas('点开'); ok('第四幕 拖开树叶 → 露出照片记录', true);
// 第五幕：拉摇杆
await page.evaluate(() => window.__app.jumpTo(4));
await hintHas('货架');
b = await box('.a5-lever');
await swipe(b.x + 34, b.y + 30, b.x + 34, b.y + 96, 12);
await page.waitForSelector('[data-a=take]', { state: 'visible', timeout: 20000 }); ok('第五幕 手指拉下摇杆 → 转出愿望', true);
// 第六幕：刮
await page.evaluate(() => window.__app.jumpTo(5));
await hintHas('刮开');
b = await box('.a6-coat');
const rows = Math.floor(b.height / 40);
let half = false;
for (let r = 0; r < rows; r++) {
  await swipe(b.x + 14, b.y + 22 + r * 40, b.x + b.width - 14, b.y + 30 + r * 40, 12);
  if (r === 2) { const part = await page.evaluate(() => document.querySelector('.a6-coat').style.opacity); half = part !== '0'; }
  if (await page.evaluate(() => document.querySelector('.a6-coat').style.opacity === '0')) break;
}
await sleep(1200);
ok('第六幕 划过哪里露出哪里，刮到一定面积后剩余涂层散开', half && await page.evaluate(() => document.querySelector('.a6-coat').style.opacity === '0'));
console.log('errors:', errors.join(' | ') || 'none');
await browser.close();
