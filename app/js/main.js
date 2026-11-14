// 主控：七幕的顺序、转场、目录、进度保存、声音开关
import { CONTENT, ACT_TITLES } from './content.js';
import { Stage, Store, UI, makeCtx, $, h, esc } from './core.js';
import { Audio } from './audio.js';
import { Cat } from './cat/cat.js';
import act1 from './acts/act1.js';
import act2 from './acts/act2.js';
import act3 from './acts/act3.js';
import act4 from './acts/act4.js';
import act5 from './acts/act5.js';
import act6 from './acts/act6.js';
import act7 from './acts/act7.js';
import { openAlbum } from './acts/album.js';

const ACTS = [act1, act2, act3, act4, act5, act6, act7];
const NUM = ['一', '二', '三', '四', '五', '六', '七'];
let current = null; // { i, ctx, root }
let cat = null;
const veil = () => $('#veil');

function setSound(on) {
  Store.data.sound = on; Store.save();
  if (on) Audio.enable(); else Audio.disable();
  $('#btn-sound').classList.toggle('off', !on);
  $('#btn-sound').setAttribute('aria-label', on ? '关闭声音' : '开启声音');
}

function newRoot(i) {
  const root = h(`<section class="act act${i + 1}" data-act="${i + 1}"></section>`);
  $('#acts').appendChild(root);
  return root;
}

function chapterCard(i) {
  const el = h(`<div class="chapter-card"><span>第${NUM[i]}幕</span><b>${esc(ACT_TITLES[i])}</b></div>`);
  $('#ui').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2300);
  setTimeout(() => el.remove(), 3000);
}

async function runAct(i, opts = {}) {
  const prev = current;
  if (prev && prev.ctx.alive) prev.ctx.abort();   // 保险：任何时候只有一幕活着
  const root = newRoot(i);
  const ctx = makeCtx(root);
  ctx.cat = cat; ctx.index = i; ctx.opts = opts; ctx.H = Stage.H;
  current = { i, ctx, root };
  document.body.dataset.act = i + 1;
  Store.data.act = i; Store.data.maxAct = Math.max(Store.data.maxAct, i); Store.save();
  UI.clear();
  cat.stop(); cat.lookAt(null); cat.extra = {}; cat.rig.setClip(null); cat.rig.tone = null; cat.el.style.filter = ''; cat.onEvent = (n) => { if (n === 'step') Audio.play('step'); else if (n === 'land') Audio.play('land'); else if (n === 'jump') Audio.play('jump'); };
  if (cat.reachS.w > 0) cat.unreach(1);
  cat.el.getAnimations && cat.el.getAnimations().forEach((x) => x.cancel()); cat.el.style.zIndex = ''; cat.el.style.opacity = '';
  try {
    ACTS[i].build(ctx);
    // 转场
    const tr = opts.transition;
    if (prev && tr && tr.type === 'pan') {
      const a = root.animate([{ transform: 'translateX(390px)' }, { transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.45,0,.2,1)' });
      prev.root.animate([{ transform: 'none' }, { transform: 'translateX(-390px)' }], { duration: 900, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
      await a.finished.catch(() => {});
      prev.root.remove();
    } else {
      if (prev) prev.root.remove();
      const v = veil();
      v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'forwards', easing: 'ease-out' });
    }
    if (!opts.quiet) chapterCard(i);
    const out = await ACTS[i].run(ctx);
    if (!ctx.alive) return;
    UI.clear();
    if (i < ACTS.length - 1) {
      const t = out || { type: 'veil', color: '#f3dfb8' };
      if (t.type !== 'pan') {
        const v = veil(); v.style.background = t.color || '#f3dfb8';
        await v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.ms || 420, fill: 'forwards', easing: 'ease-in' }).finished.catch(() => {});
      }
      if (!ctx.alive) return;   // 转场的这几百毫秒里用户从目录跳走了：不要再接着进下一幕
      ctx.abort();
      runAct(i + 1, { transition: t });
    }
  } catch (e) {
    if (!e || !e.isAbort) { console.error(e); showError(e); }
  }
}

function showError(e) {
  const el = h(`<div class="err">出了点小问题：${esc(e && e.message || e)}<br><button class="btn" type="button">重新载入这一幕</button></div>`);
  $('#ui').appendChild(el);
  $('button', el).onclick = () => { el.remove(); jumpTo(current ? current.i : 0); };
}

let jumpSeq = 0;
async function jumpTo(i) {
  const my = ++jumpSeq;
  if (current) { current.ctx.abort(); }
  UI.clear();   // 上一幕的提示和按钮立刻收掉，不留到转场里
  const v = veil(); v.style.background = '#0d1410';
  await v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' }).finished.catch(() => {});
  if (my !== jumpSeq) return;   // 这 260ms 里又有一次跳转：只让最后一次生效，否则会有两幕同时在跑
  document.querySelectorAll('.reader,.overlay-page').forEach((n) => n.remove());
  runAct(i, { jumped: true });
}

// ---------- 目录 ----------
function openMenu() {
  const d = Store.data;
  const items = ACT_TITLES.map((t, i) => {
    const open = i <= d.maxAct;
    return `<button type="button" class="menu-ch ${open ? '' : 'locked'} ${current && current.i === i ? 'now' : ''}" data-i="${i}" ${open ? '' : 'disabled'}><span>第${NUM[i]}幕</span><b>${esc(t)}</b><i>${open ? (current && current.i === i ? '正在这里' : '回看') : esc(CONTENT.ui.locked)}</i></button>`;
  }).join('');
  const el = h(`<div class="menu"><div class="menu-scrim"></div><div class="menu-paper">
    <h2>${esc(CONTENT.ui.menu)}</h2>
    <div class="menu-row">
      <button type="button" class="btn small" data-a="sound">${esc(Audio.enabled ? CONTENT.ui.soundOn : CONTENT.ui.soundOff)}</button>
      <button type="button" class="btn small" data-a="back" ${current && current.i > 0 ? '' : 'disabled'}>${esc(CONTENT.ui.back)}</button>
    </div>
    <p class="menu-sub">${esc(CONTENT.ui.chapters)}</p>
    <div class="menu-list">${items}</div>
    <div class="menu-row">
      ${d.finished ? `<button type="button" class="btn small" data-a="album">${esc(CONTENT.ui.album)}</button>` : ''}
      <button type="button" class="btn small" data-a="restart">${esc(CONTENT.ui.restart)}</button>
    </div>
    <button type="button" class="btn primary" data-a="close">${esc(CONTENT.ui.closeMenu)}</button>
  </div></div>`);
  $('#ui').appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) { if (e.target.classList.contains('menu-scrim')) close(); return; }
    Audio.play('tap');
    const a = b.dataset.a;
    if (b.dataset.i != null) { close(); jumpTo(+b.dataset.i); }
    else if (a === 'sound') { setSound(!Audio.enabled); b.textContent = Audio.enabled ? CONTENT.ui.soundOn : CONTENT.ui.soundOff; }
    else if (a === 'back') { close(); jumpTo(Math.max(0, current.i - 1)); }
    else if (a === 'album') { close(); openAlbum(); }
    else if (a === 'restart') {
      const paper = $('.menu-paper', el);
      paper.innerHTML = `<h2>${esc(CONTENT.ui.restart)}</h2><p class="menu-sub">${esc(CONTENT.ui.restartConfirm)}</p><div class="menu-row"><button type="button" class="btn primary" data-a="yes">${esc(CONTENT.ui.yes)}</button><button type="button" class="btn" data-a="close">${esc(CONTENT.ui.no)}</button></div>`;
    } else if (a === 'yes') { close(); restart(); }
    else if (a === 'close') close();
  });
}
export function restart() { Store.reset(); jumpTo(0); }
window.__app = { Audio, jumpTo, restart, openAlbum, get current() { return current; }, Store, get cat() { return cat; } };

// ---------- 启动 ----------
function boot() {
  Stage.init(); UI.init();
  // 屏幕高度明显变化（旋转、分屏）时，按新尺寸重排当前这一幕
  let rz = null;
  Stage.onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (current && Math.abs(Stage.H - current.ctx.H) > 48 && !document.querySelector('.menu,.overlay-page')) jumpTo(current.i); }, 500); };
  Store.load();
  cat = new Cat({ scale: 1.1 });
  // 摸一下小猫：它会眯眼蹭一下（叠加表情，不打断正在做的动作）
  let petT = 0;
  $('#stage').addEventListener('pointerdown', (e) => {
    if (!cat || e.target.closest('button, .reader, .menu, .overlay-page, canvas, .a2-reader') || /brightness/.test(cat.el.style.filter)) return;
    const hd = cat.rig.gHead.getBoundingClientRect();
    if (!hd.width || e.clientX < hd.left - 8 || e.clientX > hd.right + 8 || e.clientY < hd.top - 8 || e.clientY > hd.bottom + 8) return;
    const now = performance.now(); if (now - petT < 900) return; petT = now;
    const keep = cat.extra, mine = Object.assign({}, keep, { happy: 1, tilt: (keep.tilt || 0) + 7, headY: (keep.headY || 0) + 2 });
    cat.extra = mine; Audio.play('meow');
    setTimeout(() => { if (cat.extra === mine) cat.extra = keep; }, 700);
  });
  // 手指按在屏幕上时，小猫的眼睛和头跟着手指走；松开一会儿后回到它原来在看的地方
  { const st = $('#stage'); let down = false, offT = 0;
    const skip = (e) => e.target.closest('.reader, .menu, .overlay-page, .a2-reader, #topbar');
    st.addEventListener('pointerdown', (e) => { if (!cat || skip(e)) return; down = true; clearTimeout(offT); cat.lookAtClient(e.clientX, e.clientY); }, { passive: true });
    st.addEventListener('pointermove', (e) => { if (down && cat) cat.lookAtClient(e.clientX, e.clientY); }, { passive: true });
    const up = () => { if (!down) return; down = false; clearTimeout(offT); offT = setTimeout(() => cat && cat.lookAtClient(null), 700); };
    window.addEventListener('pointerup', up, { passive: true }); window.addEventListener('pointercancel', up, { passive: true }); }
  // 等得久了（提示出现后 12 秒没人碰屏幕）：小猫歪一下头看向屏幕外的你，底部提示再轻轻跳一下。不催、不自动往下走。
  { let last = performance.now();
    window.addEventListener('pointerdown', () => { last = performance.now(); }, { passive: true });
    setInterval(() => {
      if (!cat || document.hidden || performance.now() - last < 12000) return;
      const hint = $('.hint'); if (!hint || hint.hidden || document.querySelector('.reader, .menu, .overlay-page, .a2-reader')) return;
      last = performance.now();
      hint.classList.remove('in'); void hint.offsetWidth; hint.classList.add('in');
      if (/brightness/.test(cat.el.style.filter)) return;
      const keep = cat.extra, mine = Object.assign({}, keep, { tilt: (keep.tilt || 0) + 9, headY: (keep.headY || 0) - 1, earL: 8, earR: -8 });
      cat.extra = mine; setTimeout(() => { if (cat.extra === mine) cat.extra = keep; }, 1100);
    }, 1000); }
  $('#btn-sound').onclick = () => { setSound(!Audio.enabled); Audio.play('tap'); };
  $('#btn-menu').onclick = () => { Audio.play('tap'); openMenu(); };
  $('#btn-sound').classList.add('off');
  const q = new URLSearchParams(location.search);
  let startAt = 0;
  if (q.get('act')) { startAt = Math.max(0, Math.min(6, +q.get('act') - 1)); Store.data.maxAct = Math.max(Store.data.maxAct, startAt); }
  const ld = $('#loading'); if (ld) { ld.classList.add('gone'); setTimeout(() => ld.remove(), 600); }
  // 后面几幕的照片提前在后台取好，翻到时不用等
  setTimeout(() => {
    const urls = new Set();
    JSON.stringify(CONTENT, (k, v) => { if (typeof v === 'string' && /\.(svg|png|jpe?g|webp)$/i.test(v)) urls.add(v); return v; });
    ['a2-plate', 'a3-plate2', 'a4-map', 'a5-plate', 'a6-hall', 'a6-hall-open', 'a7-plate'].forEach((n) => urls.add(`assets/scene/${n}.webp`));
    urls.forEach((u) => { const im = new Image(); im.src = u; });
  }, 1500);
  veil().style.background = '#0d1410';
  if (q.get('act')) { runAct(startAt, { skipIntro: true }); return; }
  runAct(0, { intro: true, resumeAct: Store.data.act > 0 ? Store.data.act : 0, setSound, jumpTo });
}
boot();
