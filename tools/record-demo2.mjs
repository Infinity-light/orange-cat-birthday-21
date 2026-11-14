// 把线上版从开场到结尾真实走一遍并录成视频（尽量用真实触摸手势，手势没起作用才点「帮我…」按钮）。
// 用法：BASE=https://xiaojumao-film.godpenai.com node tools/record-demo.mjs <输出目录>
// v2（接续单重录）：v1 的截屏帧实际只有 360×640（再放大到 1080×1920，发虚），且没开声音。
// 画面：窗口 1080×1920、把页面的 viewport 元标签改成 width=360（页面仍按 360×640 排版，整体 3 倍渲染）、devicePixelRatio 报 3 → 截屏帧是真 1080×1920。
// 声音：开场点「开着声音看」；把送往扬声器的 WebAudio 同时接到 MediaRecorder，录成 audio.webm，事后与画面合成。
// NOSTILL=1 时沿途不截 PNG（截一张要停半秒，会让录像卡顿）——录像一遍、截图另跑一遍。
import fs from 'node:fs'; import { spawn } from 'node:child_process';
import { pw, BASE, sleep } from './pw.mjs';
const OUT = process.argv[2] || 'demo'; fs.mkdirSync(OUT + '/stills', { recursive: true });
const FPS = 30, VW = 360, VH = 640, DSF = 3;
const NOSTILL = !!process.env.NOSTILL;
const browser = await pw.chromium.launch({ headless: true, channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: VW * DSF, height: VH * DSF }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.route('**/index.html', async (r) => { const res = await r.fetch(); let b = await res.text(); if (!/<meta name="viewport"[^>]*>/.test(b)) throw new Error('no viewport meta'); b = b.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=' + VW + ', user-scalable=no">'); await r.fulfill({ response: res, body: b }); });
await ctx.addInitScript(() => {
  Object.defineProperty(window, 'devicePixelRatio', { get: () => 3 });
  const oc = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...r) {
    if (dest instanceof AudioDestinationNode) { const c = dest.context; if (!c.__msd) { c.__msd = c.createMediaStreamDestination(); const mr = new MediaRecorder(c.__msd.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 }); window.__chunks = []; mr.ondataavailable = (e) => window.__chunks.push(e.data); mr.start(1000); window.__recStart = Date.now(); window.__mr = mr; } oc.call(this, c.__msd); }
    return oc.call(this, dest, ...r);
  };
});
// 手指位置：按下时显示一个半透明圆点，松开后淡出
await ctx.addInitScript(() => {
  const mk = () => { const d = document.createElement('div'); d.id = '__finger'; d.style.cssText = 'position:fixed;z-index:99999;width:46px;height:46px;margin:-23px;border-radius:50%;pointer-events:none;background:radial-gradient(rgba(255,255,255,.55),rgba(255,255,255,.22) 60%,rgba(255,255,255,0) 72%);box-shadow:0 0 0 1.5px rgba(255,255,255,.55),0 2px 10px rgba(0,0,0,.35);opacity:0;transition:opacity .25s;left:0;top:0'; document.documentElement.appendChild(d); return d; };
  const at = (e, o) => { const d = document.getElementById('__finger') || mk(); d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.opacity = o; };
  addEventListener('pointerdown', (e) => at(e, 1), true); addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') at(e, 1); }, true);
  addEventListener('pointerup', (e) => at(e, 0), true); addEventListener('pointercancel', (e) => at(e, 0), true);
});
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const cdp = await ctx.newCDPSession(page);
// ---- 录制 ----
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + '/raw.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
let lastAt = 0; const gaps = [];
let latest = null, got = 0, written = 0, t0 = 0, recording = false, dims = '';
cdp.on('Page.screencastFrame', (f) => { latest = Buffer.from(f.data, 'base64'); got++; { const n = Date.now(); if (recording && lastAt && n - lastAt > 250) gaps.push({ t: +((n - t0) / 1000).toFixed(1), ms: n - lastAt }); lastAt = n; } if (!dims) dims = latest.readUInt16BE ? (() => { for (let i = 2; i < latest.length - 9;) { if (latest[i] !== 0xff) break; const m = latest[i + 1], l = latest.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc2) return latest.readUInt16BE(i + 7) + 'x' + latest.readUInt16BE(i + 5); i += 2 + l; } return '?'; })() : '?'; cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
const pump = setInterval(() => { if (!recording || !latest) return; const want = Math.floor((Date.now() - t0) / 1000 * FPS); while (written < want) { ff.stdin.write(latest); written++; } }, 1000 / FPS / 2);
const now = () => ((Date.now() - t0) / 1000).toFixed(1);
const marks = [];
const log = (...a) => { console.log(`[${now()}s]`, ...a); };
const mark = (name) => { marks.push({ t: +now(), name }); log('== ' + name); };
let sn = 0; const still = async (name) => { const p = `${OUT}/stills/${String(++sn).padStart(2, '0')}-${name}.png`; if (!NOSTILL) await page.screenshot({ path: p }).catch(() => {}); marks.push({ t: +now(), still: p }); };
// ---- 手势 ----
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const box = async (sel) => { const e = await page.$(sel); if (!e) return null; const b = await e.boundingBox(); return b && b.width > 0 ? b : null; };
const tapXY = async (x, y, hold = 90) => { await touch('touchStart', x, y); await sleep(hold); await touch('touchEnd'); };
const tap = async (sel, dx = 0.5, dy = 0.5) => { const b = await box(sel); if (!b) return false; await tapXY(b.x + b.width * dx, b.y + b.height * dy); return true; };
const drag = async (pts, ms = 900) => {   // pts: [[x,y],…] 折线，按总时长匀速走
  const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const n = Math.max(8, Math.round(ms / 16)); await touch('touchStart', pts[0][0], pts[0][1]); await sleep(120);
  for (let k = 1; k <= n; k++) { let d = L * (0.5 - 0.5 * Math.cos(Math.PI * k / n)), i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; } const t = seg[i] ? Math.min(1, d / seg[i]) : 1; await touch('touchMove', pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t); await sleep(ms / n); }
  await sleep(100); await touch('touchEnd');
};
const HT = `(() => { const e = document.querySelector('.hint'); if (!e || e.hidden) return ''; const c = e.cloneNode(true); c.querySelectorAll('.hint-alt').forEach((x) => x.remove()); return c.textContent; })()`;   // 只看提示语本身，不算替代按钮上的字
const hintText = () => page.evaluate(HT);
const hint = (w, timeout = 70000) => page.waitForFunction(([w, HT]) => eval(HT).includes(w), [w, HT], { timeout });
const gone = async (w, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (!(await hintText()).includes(w)) return true; await sleep(150); } return false; };
const alt = async () => { if (!(await tap('.hint-alt'))) await page.click('.hint-alt', { timeout: 1500 }).catch(() => {}); };
// 等提示出现 → 停一下让人看清 → 做真实手势 → 提示没消失就点替代按钮
const step = async (w, fn, { pre = 900, ok = 2500, timeout = 70000 } = {}) => { await hint(w, timeout); await sleep(pre); let real = false; try { real = (await fn()) !== false; } catch (e) { real = false; } const done = real && await gone(w, ok); if (!done) { log('  替代按钮 ←', w); await alt(); } else log('  手势 ✓', w); return done; };
const cta = async (pre = 700) => { await page.waitForSelector('.cta:not([hidden])', { timeout: 70000 }); await sleep(pre); await tap('.cta'); };
const vis = (sel, timeout = 40000) => page.waitForSelector(sel, { state: 'visible', timeout });
const waitAct = (n, timeout = 40000) => page.waitForFunction((n) => window.__app.current && window.__app.current.i + 1 === n, n, { timeout });

await page.goto(BASE + '/index.html'); await sleep(2500);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: VW * DSF, maxHeight: VH * DSF, everyNthFrame: 1 });
await sleep(400); t0 = Date.now(); recording = true;
mark('开场'); await sleep(1800); await still('开场');
await tap('[data-s="1"]');
// ---------- 第一幕 ----------
mark('第一幕 拆礼物'); await hint('封条'); await sleep(1500); await still('a1-礼物');
await step('封条', async () => { const b = await box('.a1-tab'); if (!b) return false; const x = b.x + b.width / 2, y = b.y + b.height / 2; await drag([[x, y], [x + 3, y + 120]], 1300); await sleep(900); await still('a1-撕到一半'); const b2 = await box('.a1-tab'); const x2 = b2 ? b2.x + b2.width / 2 : x, y2 = b2 ? b2.y + b2.height / 2 : y + 120; await drag([[x2, y2], [x2 + 4, y2 + 200]], 1500); }, { pre: 300, ok: 3000 });
await hint('爪子'); await sleep(1800); await still('a1-探头'); await sleep(900);
await step('爪子', () => tap('.a1-paw'), { pre: 0 });
await sleep(1300); await still('a1-跳出来');
await page.waitForSelector('.cta:not([hidden])', { timeout: 60000 }); await sleep(900); await still('a1-回头等你'); await cta(500);
// ---------- 第二幕 ----------
await waitAct(2); mark('第二幕 小猫照相馆'); await sleep(900);
for (let i = 0; i < 3; i++) {
  await hint('抽出来'); if (i === 0) { await sleep(500); await still('a2-踩快门'); }
  await step('抽出来', async () => { const b = await box('.a2-slot'); if (!b) return false; const x = b.x + b.width / 2, y = b.y + b.height * 0.6; await drag([[x, y], [x + 6, y + 150]], 900); }, { pre: 700, ok: 2500 });
  await vis('[data-a=flip]:not([hidden])'); await sleep(i === 0 ? 2600 : 1800); if (i === 0) await still('a2-显影后的照片');
  if (i === 0) { if (await tap('.a2-card .hot:not([hidden])')) { await sleep(2600); await still('a2-照片里的小物件'); await tap('.a2-note button'); await sleep(600); } }
  if (i === 2) { await tap('[data-a=flip]'); await sleep(2600); await still('a2-照片背面'); }
  await tap('[data-a=keep]');
}
await hint('胶卷'); await sleep(1200); await still('a2-拉胶卷');
await step('胶卷', async () => { const b = await box('.a2-strip'); if (!b) return false; const x = b.x + b.width / 2, y = b.y + b.height / 2; await drag([[x, y], [x + 70, y]], 700); }, { pre: 500 });
// ---------- 第三幕 ----------
await waitAct(3); mark('第三幕 一年的胶卷'); await sleep(1500); await still('a3-胶卷开头');
let a3n = 0;
for (let guard = 0; guard < 70; guard++) {
  if (await page.$('.a3-ticket')) break;
  const t = await hintText();
  const item = await box('.a3-inter:not(.done) .a3-items button[data-i="0"]');
  if (t.includes('擦')) { const b = await box('.a3-fog'); await sleep(900); await still('a3-起雾的照片'); if (b) { const p = []; for (let r = 0; r < 7; r++) { const y = b.y + b.height * (0.12 + r * 0.125); p.push([b.x + b.width * (r % 2 ? 0.92 : 0.08), y], [b.x + b.width * (r % 2 ? 0.08 : 0.92), y]); } await drag(p, 3200); } if (!(await gone('擦', 1500))) await alt(); await sleep(1800); await still('a3-擦干净'); }
  else if (t.includes('便签')) { await sleep(1200); await alt(); await sleep(2600); await still('a3-便签'); }
  else if (item) { await sleep(1500); await (await page.$('.a3-inter:not(.done) .a3-items button[data-i="0"]')).scrollIntoViewIfNeeded().catch(() => {}); await sleep(400); const item = await box('.a3-inter:not(.done) .a3-items button[data-i="0"]'); await tapXY(item.x + item.width / 2, item.y + item.height / 2); await sleep(2200); await still('a3-找到那一样'); }
  else if (t.includes('拉')) { await sleep(a3n ? 2400 : 900); const y = VH * 0.36; await drag([[300, y], [70, y + 4]], 650); if (!(await gone(t.trim().slice(0, 4), 1600))) { log('  替代按钮 ← 拉胶卷'); await alt(); } a3n++; await sleep(1900); await still('a3-第' + a3n + '格'); }
  else await sleep(500);
}
await hint('车票'); await sleep(1500); await still('a3-车票');
await step('车票', () => tap('.a3-ticket'), { pre: 600 });
// ---------- 第四幕 ----------
await waitAct(4, 60000); mark('第四幕 小镇地图'); await sleep(1200);
const places = [['台灯', '图书馆'], ['店门', '面馆'], ['树叶', '河堤'], ['发车牌', '车站']];
for (const [w, name] of places) {
  await hint(w, 90000); await sleep(900); await still('a4-' + name);
  await step(w, async () => { const b = await box('.a4-hit.explore'); if (!b) return false; const x = b.x + b.width / 2, y = b.y + b.height / 2; if (w === '树叶') await drag([[x, y], [x + 70, y - 10]], 800); else await tapXY(x, y); }, { pre: 600 });
  await hint('点开'); await sleep(1300); await still('a4-' + name + '-记录出现');
  await step('点开', () => tap('.a4-hit.record:not(.seen)'), { pre: 300 });
  await vis('.reader-close'); await sleep(3200); await still('a4-' + name + '-内容'); await tap('.reader-close'); await sleep(900); if (await page.$('.reader-close')) await page.click('.reader-close', { timeout: 2000 }).catch(() => {}); await cta(900);
}
await hint('推门', 90000); await sleep(1800); await still('a4-夜里的小店');
await step('推门', () => tap('.a4-hit.explore'), { pre: 500 });
// ---------- 第五幕 ----------
await waitAct(5); mark('第五幕 生日好运小卖部'); await hint('货架'); await sleep(1200); await still('a5-小卖部');
for (const i of [0, 3]) { if (await tap(`.a5-item[data-i="${i}"]`)) { await sleep(2400); if (i === 0) await still('a5-货架上的小东西'); await tap('.a5-tag button'); await sleep(700); } }
if (!(await hintText()).includes('摇杆')) await alt();
await step('摇杆', async () => { const b = await box('.a5-lever'); if (!b) return false; const x = b.x + b.width * 0.5, y = b.y + b.height * 0.12; await drag([[x, y], [x - 4, y + 110]], 700); }, { pre: 900, ok: 2500 });
await sleep(1500); await still('a5-转起来');
await vis('[data-a=take]'); await sleep(1800); await still('a5-摇出愿望'); await tap('[data-a=take]');
await hint('卡片'); await sleep(1500); await still('a5-小猫推卡片');
await step('卡片', () => tap('.a5-card'), { pre: 500 });
// ---------- 第六幕 ----------
await waitAct(6); mark('第六幕 写给你的话'); await hint('刮开'); await sleep(1300); await still('a6-刮刮卡');
await step('刮开', async () => { const b = await box('.a6-coat'); if (!b) return false; const p = []; for (let r = 0; r < 9; r++) { const y = b.y + b.height * (0.08 + r * 0.105); p.push([b.x + b.width * (r % 2 ? 0.93 : 0.07), y], [b.x + b.width * (r % 2 ? 0.07 : 0.93), y]); } await drag(p.slice(0, 8), 2400); await still('a6-刮到一半'); await sleep(300); await drag(p.slice(8), 2800); }, { pre: 300, ok: 2500 });
await sleep(2600); await still('a6-那段话');
for (let i = 0; i < 6; i++) { await cta(i === 0 ? 2200 : 1700); await sleep(500); if (i < 5) await still('a6-' + (i + 1)); }
await hint('暖光', 90000); await sleep(1500); await still('a6-门');
await step('暖光', () => tap('.a6-doorwrap'), { pre: 600 });
// ---------- 第七幕 ----------
await waitAct(7); mark('第七幕 生日房间'); await hint('灯'); await sleep(1600); await still('a7-暗着的房间');
for (const l of [0, 2, 1]) { await tap(`.a7-lamp[data-l="${l}"]`); await sleep(1500); if (l === 0) await still('a7-第一盏灯'); }
if ((await hintText()).includes('点亮这几盏灯')) await alt();
await hint('蜡烛', 90000); await sleep(1800); await still('a7-亮灯');
for (const c of [0, 1]) { await tap(`.a7-candle[data-c="${c}"]`); await sleep(1100); }
if ((await hintText()).includes('蜡烛')) { await sleep(800); if ((await hintText()).includes('蜡烛')) await alt(); }
await sleep(2500); await still('a7-点蜡烛');
await vis('.a7-actions:not([hidden])', 120000); await sleep(3800); await still('a7-祝福');
await tap('.a7-fold'); await sleep(4200); await still('a7-小猫睡着');
mark('回忆册和纪念卡'); await tap('[data-a=album]'); await sleep(1800); await still('回忆册');
await drag([[180, 520], [180, 160]], 900); await sleep(1300); await drag([[180, 520], [180, 160]], 900); await sleep(1300); await still('回忆册-往下');
await tap('.al-close'); await sleep(900);
await tap('[data-a=card]'); await vis('.keep-img img, .keep-img canvas'); await sleep(3200); await still('纪念卡');
await tap('.keep button:last-of-type'); await sleep(2500); await still('结尾'); await sleep(3500);
mark('结束');
recording = false; clearInterval(pump); await cdp.send('Page.stopScreencast').catch(() => {});
const au = await page.evaluate(async () => { if (!window.__mr) return null; await new Promise((r) => { window.__mr.onstop = r; window.__mr.stop(); }); const blob = new Blob(window.__chunks, { type: 'audio/webm' }); const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); return { b64, recStart: window.__recStart }; }).catch((e) => { console.log('audio fail', e.message); return null; });
let audioOffset = null; if (au) { fs.writeFileSync(OUT + '/audio.webm', Buffer.from(au.b64, 'base64')); audioOffset = (au.recStart - t0) / 1000; }
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
fs.writeFileSync(OUT + '/marks.json', JSON.stringify({ seconds: +now(), framesFromBrowser: got, framesWritten: written, frameSize: dims, audioOffset, gaps, marks, errors }, null, 1));
console.log({ seconds: +now(), framesFromBrowser: got, avgFps: +(got / +now()).toFixed(1), framesWritten: written, frameSize: dims, audioOffset, gaps: gaps.length, errors: errors.length ? errors : 'none' });
await browser.close();
