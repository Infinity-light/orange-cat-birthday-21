// 舞台、进度保存、通用交互工具、界面层（提示条 / 继续按钮 / 阅读纸 / 目录）
import { CONTENT } from './content.js';
import { Audio } from './audio.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
export const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// 可复现的伪随机
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// 实拍质感的底图：贴着舞台底边放（各幕的地面线都是从底边往上量的），屏幕比底图高时上面用墙色接上去
export const plate = (name, top = '#1b2b22', cls = '') => `<div class="plate ${cls}" style="--top:${top};background-image:url(assets/scene/${name}.webp)"></div>`;
// 光束里的浮尘：n 粒，落在 box=[x,y,w,h] 范围内
export function motes(n = 14, box = [0, 0, 390, 500], seed = 3) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) s += `<i style="left:${(box[0] + r() * box[2]).toFixed(0)}px;top:${(box[1] + r() * box[3]).toFixed(0)}px;--dx:${(r() * 70 - 20).toFixed(0)}px;--dy:${(-30 - r() * 80).toFixed(0)}px;--o:${(0.25 + r() * 0.55).toFixed(2)};animation-duration:${(7 + r() * 9).toFixed(1)}s;animation-delay:${(-r() * 12).toFixed(1)}s;transform:scale(${(0.6 + r() * 1.2).toFixed(2)})"></i>`;
  return `<div class="motes">${s}</div>`;
}

// ---------- 舞台：逻辑宽度固定 390，整体缩放到屏幕 ----------
export const Stage = {
  W: 390, H: 780, scale: 1, el: null,
  init() {
    this.el = $('#stage');
    const fit = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      let s = vw / 390;
      if (vh / s < 640) s = vh / 780;   // 宽屏/横屏：按 780 高的手机比例居中显示
      this.scale = s; this.H = Math.min(920, vh / s);
      const w = 390 * s, hh = this.H * s;
      this.el.style.width = '390px'; this.el.style.height = this.H + 'px';
      this.el.style.transform = `translate(${(vw - w) / 2}px, ${(vh - hh) / 2}px) scale(${s})`;
      this.el.style.setProperty('--H', this.H + 'px');
      document.documentElement.style.setProperty('--H', this.H + 'px');
      if (this.onResize) this.onResize();
    };
    fit();
    // 舞台本身不允许被滚动（聚焦、scrollIntoView 之类可能把 overflow:hidden 的容器悄悄滚走）
    this.el.addEventListener('scroll', () => { this.el.scrollTop = 0; this.el.scrollLeft = 0; });
    // 微信 / iOS 里禁止整页被拖动回弹；可滚动的纸（阅读纸、回忆册等）除外
    document.addEventListener('touchmove', (e) => {
      let n = e.target;
      while (n && n !== document.body) { if (n.scrollHeight > n.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return; n = n.parentNode; }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 200));
  },
  // 指针事件 → 舞台逻辑坐标
  point(e) { const r = this.el.getBoundingClientRect(); return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale]; },
};

// ---------- 进度保存 ----------
const KEY = 'bd21-cat-v1';
export const Store = {
  data: { act: 0, maxAct: 0, sound: null, wish: null, sub: {}, finished: false },
  load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && typeof d.act === 'number') Object.assign(this.data, d); } catch (e) { /* 无痕模式等 */ } return this.data; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  reset() { const sound = this.data.sound; this.data = { act: 0, maxAct: 0, sound, wish: null, sub: {}, finished: false }; this.save(); },
};

// ---------- 每一幕的上下文：可中断的等待 ----------
export class Abort extends Error { constructor() { super('abort'); this.isAbort = true; } }
export function makeCtx(root) {
  let rejectAll; const aborted = new Promise((_, rej) => { rejectAll = rej; });
  aborted.catch(() => {});
  const cleanups = [];
  const ctx = {
    root, alive: true, H: Stage.H, W: 390,
    abort() { if (!ctx.alive) return; ctx.alive = false; cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { /* */ } }); rejectAll(new Abort()); },
    onCleanup(f) { cleanups.push(f); },
    g(p) { if (!ctx.alive) return Promise.reject(new Abort()); return Promise.race([p, aborted]); },
    wait(ms) { return ctx.g(new Promise((r) => { const t = setTimeout(r, reduced ? Math.min(ms, 400) : ms); cleanups.push(() => clearTimeout(t)); })); },
    on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); cleanups.push(() => el.removeEventListener(ev, fn, opt)); },
    // 等用户点一下某个元素
    tap(el) {
      return ctx.g(new Promise((res) => {
        const fn = (e) => { el.removeEventListener('click', fn); res(e); };
        el.addEventListener('click', fn); cleanups.push(() => el.removeEventListener('click', fn));
      }));
    },
    // Web Animations，结束后保留终态
    anim(el, kf, opt = {}) {
      const o = Object.assign({ duration: 400, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }, opt);
      if (reduced) o.duration = Math.min(o.duration, 200);
      let a; try { a = el.animate(kf, o); } catch (e) { return Promise.resolve(); }
      return ctx.g(a.finished.catch(() => {}));
    },
    // 拖动：回调收到舞台逻辑坐标
    drag(el, { start, move, end }) {
      let active = null;
      const down = (e) => {
        if (active != null) return;
        const p = Stage.point(e);
        if (start && start(p, e) === false) return;
        active = e.pointerId; try { el.setPointerCapture(e.pointerId); } catch (err) { /* */ }
        e.preventDefault();
      };
      const mv = (e) => { if (e.pointerId !== active) return; move && move(Stage.point(e), e); };
      const up = (e) => { if (e.pointerId !== active) return; active = null; end && end(Stage.point(e), e); };
      ctx.on(el, 'pointerdown', down); ctx.on(el, 'pointermove', mv); ctx.on(el, 'pointerup', up); ctx.on(el, 'pointercancel', up);
      return () => { active = null; el.removeEventListener('pointerdown', down); };
    },
  };
  return ctx;
}

// ---------- 界面层 ----------
const HAND = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path d="M13 4.5c1.4 0 2.4 1 2.4 2.4v7.3l6.6 1.3c1.9.4 3.2 2.1 3 4l-.7 5.3c-.3 2-2 3.6-4.100 3.600h-5.300c-1.300 0-2.500-.600-3.300-1.600l-5.100-6.600c-.800-1 -.500-2.500.600-3.200 1-.600 2.200-.400 3 .400l1 1.100V6.900c0-1.400 1-2.400 2.300-2.400z" fill="#fff7e8" stroke="#6a3b1f" stroke-width="1.8" stroke-linejoin="round"/></svg>';

export const UI = {
  layer: null, hintEl: null, capEl: null, ctaEl: null,
  init() {
    this.layer = $('#ui');
    this.hintEl = h('<div class="hint" hidden><span class="hint-hand"></span><span class="hint-text"></span><button class="hint-alt" type="button"></button></div>');
    this.capEl = h('<div class="caption" hidden></div>');
    this.ctaEl = h('<button class="cta" type="button" hidden></button>');
    this.layer.append(this.capEl, this.hintEl, this.ctaEl);
    $('.hint-hand', this.hintEl).innerHTML = HAND;
  },
  // 手势提示 + 替代按钮。alt: 按钮文字；onAlt: 点击回调
  hint(text, alt, onAlt) {
    const el = this.hintEl;
    if (!text) { el.hidden = true; return; }
    $('.hint-text', el).textContent = text;
    const b = $('.hint-alt', el);
    if (alt) { b.hidden = false; b.textContent = alt; b.onclick = (e) => { e.stopPropagation(); Audio.play('tap'); onAlt && onAlt(); }; } else { b.hidden = true; b.onclick = null; }
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  },
  // 旁白（小纸条）
  caption(text) {
    const el = this.capEl;
    if (!text) { el.hidden = true; return; }
    el.innerHTML = nl2br(text); el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  },
  // 「继续」类按钮：返回 Promise，用户点了才继续
  cta(ctx, label) {
    const el = this.ctaEl; el.textContent = label || CONTENT.ui.continue; el.hidden = false;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    ctx.onCleanup(() => { el.hidden = true; });
    return ctx.tap(el).then((e) => { el.hidden = true; Audio.play('tap'); return e; });
  },
  clear() { this.hint(null); this.caption(null); this.ctaEl.hidden = true; },
  // 阅读纸：盖在场景上的一张纸，用户自己关
  reader(ctx, { html, closeLabel, cls = '' }) {
    const el = h(`<div class="reader ${cls}"><div class="reader-scrim"></div><div class="reader-paper"><div class="reader-body">${html}</div><i class="reader-cue" hidden>▾ 往下还有</i><button class="btn reader-close" type="button">${esc(closeLabel || CONTENT.ui.continue)}</button></div></div>`);
    this.layer.appendChild(el);
    // 内容比纸长时（矮屏、带视频的记录）：纸内可以滚动，并提示「往下还有」，滚到底提示消失
    { const body = $('.reader-body', el), cue = $('.reader-cue', el);
      const upd = () => { cue.hidden = !(body.scrollHeight - body.scrollTop - body.clientHeight > 20); };
      body.addEventListener('scroll', upd, { passive: true }); setTimeout(upd, 450); setTimeout(upd, 1500); }
    Audio.play('paper'); Audio.duck(true);
    const done = () => { Audio.duck(false); el.classList.add('out'); setTimeout(() => el.remove(), 320); };
    ctx.onCleanup(() => el.remove());
    return ctx.tap($('.reader-close', el)).then(() => { Audio.play('tap'); done(); });
  },
};

// 小工具：SVG 字符串里常用的纸张纹理滤镜（只在静态元素上用，避免每帧重算）
export const PAPER_FILTER = `<filter id="paperTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.22  0 0 0 0 0.1  0 0 0 0.11 0"/><feComposite operator="in" in2="SourceGraphic"/><feBlend in2="SourceGraphic" mode="multiply"/></filter>`;
