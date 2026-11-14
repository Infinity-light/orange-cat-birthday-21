// 新旧两版在同样的时刻各截一张：node tools/compare-shots.mjs <tag> [幕号,幕号…]
// BASE=地址（旧版 https://xiaojumao.godpenai.com，新版本地或线上）。输出 shots/cmp/<tag>-<幕>-<名字>.png
import fs from 'node:fs';
import { open, BASE, sleep } from './pw.mjs';
const tag = process.argv[2] || 'new', only = (process.argv[3] || '1,2,3,4,5,6,7').split(',').map(Number);
fs.mkdirSync('shots/cmp', { recursive: true });
const { browser, page, errors } = await open({ viewport: { width: 390, height: 844 } });
const shot = (n) => page.screenshot({ path: `shots/cmp/${tag}-${n}.png` });
const hint = (t, timeout = 70000) => page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, t, { timeout });
const alt = async () => { await sleep(250); await page.click('.hint-alt'); };
const cta = async () => { await page.waitForSelector('.cta:not([hidden])', { timeout: 70000 }); await sleep(350); await page.click('.cta'); };
const click = async (s) => { await page.waitForSelector(s, { state: 'visible', timeout: 40000 }); await sleep(200); await page.click(s); };
const go = (n) => page.goto(BASE + '/index.html?act=' + n);
const ACTS = {
  1: async () => {
    await page.goto(BASE + '/index.html'); await sleep(1800); await click('[data-s="0"]');
    await hint('封条'); await sleep(600); await shot('1a-礼物');
    await alt(); await sleep(900); await shot('1b-撕到一半');
    await hint('爪子'); await sleep(700); await shot('1c-探头');
    await alt(); await page.waitForSelector('.cta:not([hidden])', { timeout: 60000 }); await sleep(500); await shot('1d-跳出来');
  },
  2: async () => {
    await go(2); await hint('抽出来'); await sleep(500); await shot('2a-踩快门');
    await alt(); await page.waitForSelector('[data-a=flip]:not([hidden])', { timeout: 40000 }); await sleep(600); await shot('2b-看照片');
    await click('[data-a=keep]'); await hint('抽出来'); await alt(); await click('[data-a=keep]'); await hint('抽出来'); await alt();
    await click('[data-a=flip]'); await sleep(900); await click('[data-a=keep]'); await hint('胶卷'); await sleep(500); await shot('2c-拉胶卷');
  },
  3: async () => {
    await go(3); await hint('往左拉'); await sleep(500); await shot('3a-胶卷');
    await alt(); await sleep(2000); await shot('3b-第一格');
  },
  4: async () => {
    await go(4); await hint('台灯'); await sleep(500); await shot('4a-图书馆');
    await alt(); await hint('点开'); await alt(); await click('.reader-close'); await cta();
    await hint('店门'); await sleep(400); await shot('4b-面馆');
    await alt(); await hint('点开'); await alt(); await click('.reader-close'); await cta();
    await hint('树叶'); await alt(); await hint('点开'); await sleep(500); await shot('4c-河堤'); await alt(); await click('.reader-close'); await cta();
    await hint('发车牌'); await alt(); await hint('点开'); await alt(); await click('.reader-close'); await cta();
    await hint('推门'); await sleep(1500); await shot('4d-夜里的小店');
  },
  5: async () => {
    await go(5); await hint('货架'); await sleep(700); await shot('5a-小卖部');
    await alt(); await hint('摇杆'); await alt(); await page.waitForSelector('[data-a=take]', { state: 'visible', timeout: 30000 }); await sleep(500); await shot('5b-摇出愿望');
    await click('[data-a=take]'); await hint('卡片'); await sleep(600); await shot('5c-接住卡片');
  },
  6: async () => {
    await go(6); await hint('刮开'); await sleep(700); await shot('6a-刮刮卡');
    await alt(); await sleep(1700); await shot('6b-那段话');
    for (let i = 0; i < 6; i++) { await cta(); await sleep(500); }
    await hint('暖光'); await sleep(600); await shot('6c-门');
  },
  7: async () => {
    await go(7); await hint('灯'); await sleep(700); await shot('7a-暗着的房间');
    await alt(); await hint('蜡烛'); await sleep(700); await shot('7b-亮灯');
    await alt(); await page.waitForSelector('.a7-actions:not([hidden])', { timeout: 90000 }); await sleep(1500);
    await page.click('.a7-fold').catch(() => {}); await sleep(900); await shot('7c-趴下');
  },
};
for (const n of only) { try { await ACTS[n](); console.log('act', n, 'ok'); } catch (e) { console.log('act', n, 'FAILED', e.message.split('\n')[0]); await shot(n + 'FAIL'); } }
console.log(errors.filter((e) => !/favicon|404/.test(e)).join('\n') || 'no errors'); await browser.close();
