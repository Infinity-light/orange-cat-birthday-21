// 小橘猫 · 控制器：姿势混合、动作片段播放、程序化步态、跟手伸爪、带缓冲的跳跃
import { CatRig, BASE, POSE_KEYS } from './rig.js';
import { POSES, CLIPS } from './clips.js';

const EASE = {
  lin: (t) => t,
  io: (t) => t * t * (3 - 2 * t),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
};
export const ease = EASE;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function fullPose(p) {
  if (typeof p === 'string') p = POSES[p] || {};
  const o = {};
  for (const k of POSE_KEYS) o[k] = (p[k] !== undefined) ? p[k] : BASE[k];
  return o;
}

// 全局时钟：所有小猫共用一个 rAF
const cats = new Set();
let last = 0, running = false;
function loop(now) {
  if (!cats.size) { running = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  for (const c of cats) c.tick(dt);
  requestAnimationFrame(loop);
}
function ensureLoop() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

// 步态参数
const GAIT = {
  walk: { S: 25, duty: 0.64, lift: 8, bob: 1.1, pitch: 1.4, period: 0.66 },
  run: { S: 36, duty: 0.5, lift: 12, bob: 2.6, pitch: 3.2, period: 0.4 },
};

export class Cat {
  constructor(opts = {}) {
    this.rig = new CatRig(); this.rig.flip = () => this.flip;
    this.el = document.createElement('div');
    this.el.className = 'cat';
    this.inner = document.createElement('div');
    this.inner.className = 'cat-inner';
    this.inner.appendChild(this.rig.svg);
    this.el.appendChild(this.inner);
    this.x = 0; this.y = 0; this.scale = opts.scale || 1; this.facing = 1; this.flip = 1;
    this.base = fullPose({});
    this.tween = null;
    this.token = 0;
    this.gait = { w: 0, target: 0, phase: 0, kind: 'walk' };
    this.look = { turn: 0, x: 0, y: 0, tTurn: 0, tx: 0, ty: 0, on: false };
    this.reachS = { w: 0, from: 0, to: 0, t: 1, ms: 1, tx: 60, ty: -40, gx: 60, gy: -40, pat: 0, resolve: null };
    this.extra = {};        // 场景可叠加的姿势偏移
    this.t = Math.random() * 10;
    this.blinkT = 2 + Math.random() * 2; this.blinkV = 0; this.blinkPhase = -1;
    this.earT = 3 + Math.random() * 4; this.earV = 0;
    this.onEvent = null;    // (name) => {}  'step' | 'land' | 'jump'
    this.autoBlink = true;
    this.paused = false;
    this.final = fullPose({});
    this.applyTransform();
    this.rig.update(this.final, 0);
  }

  mount(parent) { parent.appendChild(this.el); cats.add(this); ensureLoop(); return this; }
  unmount() { cats.delete(this); this.el.remove(); }

  place(x, y, o = {}) {
    this.x = x; this.y = y;
    if (o.scale) this.scale = o.scale;
    if (o.facing) { this.facing = o.facing; this.flip = o.facing; }
    this.applyTransform();
    return this;
  }
  applyTransform() {
    const s = this.scale;
    this.el.style.transform = `translate3d(${this.x.toFixed(2)}px,${this.y.toFixed(2)}px,0)`;
    const svg = this.rig.svg;
    if (this._s !== s) {
      this._s = s; const VB = this.rig.VB;
      svg.style.width = VB.w * s + 'px'; svg.style.height = VB.h * s + 'px';
      svg.style.left = VB.x * s + 'px'; svg.style.top = VB.y * s + 'px';
      this.rig.setScale(s);
    }
    this.inner.style.transform = `scaleX(${this.flip.toFixed(3)})`;
  }
  // 父坐标 ↔ 小猫本地坐标
  toLocal(px, py) { return [((px - this.x) / this.scale) * this.facing, (py - this.y) / this.scale]; }
  toParent(lx, ly) { return [this.x + lx * this.scale * this.facing, this.y + ly * this.scale]; }
  joint(name) { const j = this.rig.joints[name]; return j ? this.toParent(j[0], j[1]) : [this.x, this.y]; }

  // ---- 姿势过渡 ----
  setPose(p) { this.base = fullPose(p); this.tween = null; }
  poseTo(p, ms = 300, e = 'io') {
    const to = fullPose(p);
    if (this.tween && this.tween.resolve) this.tween.resolve(false);
    return new Promise((resolve) => {
      if (ms <= 0) { this.base = to; this.tween = null; resolve(true); return; }
      this.tween = { from: Object.assign({}, this.base), to, t: 0, ms, e: EASE[e] || EASE.io, resolve };
    });
  }
  // 播放动作片段；返回的 Promise 在片段播完（或被打断）时结束
  async play(name, opts = {}) {
    const steps = typeof name === 'string' ? CLIPS[name] : name;
    if (!steps) return;
    const tk = ++this.token;
    const speed = opts.speed || 1;
    for (const s of steps) {
      if (tk !== this.token) return false;
      await this.poseTo(s.pose, (s.ms || 300) / speed, s.ease || 'io');
      if (tk !== this.token) return false;
      if (s.hold) await this.wait(s.hold / speed);
    }
    return tk === this.token;
  }
  stop() { this.token++; }
  wait(ms) { return new Promise((r) => { this._waits = this._waits || []; this._waits.push({ t: ms, r }); }); }

  // ---- 视线 ----
  // 跟着手指看：用屏幕坐标，手指按着/移动时优先于场景设定的视线，松开后还回去
  lookAtClient(cx, cy) {
    const t = this.touchLook || (this.touchLook = { on: false, tTurn: 0, tx: 0, ty: 0 });
    if (cx == null) { t.on = false; return; }
    const r = this.rig.gHead.getBoundingClientRect(); if (!r.width) { t.on = false; return; }
    const dx = (cx - (r.left + r.width / 2)) * (this.facing < 0 ? -1 : 1), dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = r.width / 70;   // k：头在屏幕上的大小，用来把像素距离换算回骨骼尺度
    t.on = true; t.tTurn = clamp(dx / (130 * k), -1, 1) * 0.85; t.tx = clamp(dx / d * 1.6, -1.6, 1.6); t.ty = clamp(dy / d * 1.6, -1.6, 1.6);
  }
  lookAt(px, py) {
    if (px == null) { this.look.on = false; this.look.tTurn = 0; this.look.tx = 0; this.look.ty = 0; return; }
    const head = this.rig.joints.head || [45, -85];
    const [lx, ly] = this.toLocal(px, py);
    const dx = lx - head[0], dy = ly - head[1];
    const d = Math.hypot(dx, dy) || 1;
    this.look.on = true;
    this.look.tTurn = clamp(dx / 130, -1, 1) * 0.85;
    this.look.tx = clamp(dx / d * 1.6, -1.6, 1.6);
    this.look.ty = clamp(dy / d * 1.6, -1.6, 1.6);
  }

  // ---- 行走 ----
  async face(dir) {
    if (dir === this.facing) return;
    this.facing = dir;
    // 转身：头先朝新方向转过去，身体收窄到一半时直接翻面（不经过「纸片」那几帧），翻过来后头再回正
    const from = this.flip, t0 = performance.now(), MIN = 0.72, MS = 220;
    await new Promise((res) => {
      const step = () => {
        const u = clamp((performance.now() - t0) / MS, 0, 1);
        if (u < 0.5) { const k = EASE.io(u / 0.5); this.flip = lerp(from, MIN * Math.sign(from || 1), k); this.turnLead = -0.95 * k; }
        else { const k = EASE.io((u - 0.5) / 0.5); this.flip = lerp(MIN * dir, dir, k); this.turnLead = 0.55 * (1 - k); }
        this.applyTransform();
        if (u < 1) requestAnimationFrame(step); else { this.turnLead = 0; res(); }
      };
      step();
    });
  }
  // 走到 x（父坐标）。speed: px/s
  async walkTo(x, opts = {}) {
    const kind = opts.run ? 'run' : 'walk';
    const g = GAIT[kind];
    const tk = ++this.moveToken || (this.moveToken = 1);
    const dir = x >= this.x ? 1 : -1;
    if (Math.abs(x - this.x) < 2) return;
    if (opts.keepFacing !== true) await this.face(dir);
    this.gait.kind = kind; this.gait.target = 1;
    const cycleDist = (g.S / g.duty) * this.scale;
    const speed = opts.speed || cycleDist / g.period;
    this.mover = { x, dir, speed, cycleDist, tk, y: opts.y, y0: this.y, x0: this.x };
    await new Promise((res) => { this.mover.res = res; });
    if (tk === this.moveToken) this.gait.target = 0;
  }
  // 外部驱动步态（例如沿胶卷走：位移由拖动决定）
  gaitDrive(distPx, kind = 'walk') {
    const g = GAIT[kind];
    this.gait.kind = kind;
    this.gait.phase += Math.abs(distPx) / ((g.S / g.duty) * this.scale);
    this.gait.target = 1; this._driveT = 0.18;
  }

  // ---- 跳跃：预备下蹲 → 蹬地 → 腾空 → 前爪探地 → 落地缓冲 ----
  async jumpTo(x, y, opts = {}) {
    const h = opts.h == null ? 70 : opts.h, ms = opts.ms || 520;
    const tk = ++this.token;
    const dir = x >= this.x ? 1 : -1;
    if (Math.abs(x - this.x) > 4) await this.face(dir);
    await this.poseTo('jumpCrouch', 230, 'out');
    await this.wait(80);
    if (this.onEvent) this.onEvent('jump');
    this.poseTo('jumpLaunch', 110, 'in');
    const x0 = this.x, y0 = this.y, t0 = performance.now();
    let stage = 0;
    await new Promise((res) => {
      const step = () => {
        const u = clamp((performance.now() - t0) / ms, 0, 1);
        this.x = lerp(x0, x, u);
        this.y = lerp(y0, y, u) - 4 * h * u * (1 - u);
        this.applyTransform();
        if (stage === 0 && u > 0.2) { stage = 1; this.poseTo('jumpAir', ms * 0.3, 'out'); }
        if (stage === 1 && u > 0.58) { stage = 2; this.poseTo('jumpReach', ms * 0.3, 'io'); }
        if (u < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
    if (this.onEvent) this.onEvent('land');
    await this.poseTo('jumpLand', 90, 'in');
    await this.wait(70);
    if (tk === this.token) await this.poseTo(opts.end || 'stand', 320, 'back');
  }

  // ---- 伸爪：肩膀、前腿、爪子一起朝目标运动 ----
  reach(px, py, opts = {}) {
    const [lx, ly] = this.toLocal(px, py);
    const r = this.reachS;
    r.gx = lx; r.gy = ly;
    if (r.w < 0.05) { r.tx = lx; r.ty = ly; }
    r.from = r.w; r.to = 1; r.t = 0; r.ms = opts.ms || 380;
    return new Promise((res) => { if (r.resolve) r.resolve(); r.resolve = res; });
  }
  reachMove(px, py) { const [lx, ly] = this.toLocal(px, py); this.reachS.gx = lx; this.reachS.gy = ly; }
  unreach(ms = 320) {
    const r = this.reachS;
    r.from = r.w; r.to = 0; r.t = 0; r.ms = ms;
    return new Promise((res) => { if (r.resolve) r.resolve(); r.resolve = res; });
  }
  async pat(n = 1, depth = 7) {
    for (let i = 0; i < n; i++) {
      await this._patTo(depth, 90); if (this.onEvent) this.onEvent('pat'); await this._patTo(0, 150);
    }
  }
  _patTo(v, ms) {
    const r = this.reachS, from = r.pat, t0 = performance.now();
    return new Promise((res) => {
      const step = () => { const u = clamp((performance.now() - t0) / ms, 0, 1); r.pat = lerp(from, v, EASE.io(u)); if (u < 1) requestAnimationFrame(step); else res(); };
      step();
    });
  }

  // ---- 每帧 ----
  tick(dt) {
    if (this.paused) return;
    this.t += dt;
    // waits
    if (this._waits && this._waits.length) {
      for (const w of this._waits) w.t -= dt * 1000;
      const done = this._waits.filter((w) => w.t <= 0);
      if (done.length) { this._waits = this._waits.filter((w) => w.t > 0); done.forEach((w) => w.r()); }
    }
    // 姿势过渡
    const tw = this.tween;
    if (tw) {
      tw.t += dt * 1000;
      const u = clamp(tw.t / tw.ms, 0, 1), k = tw.e(u);
      for (const key of POSE_KEYS) this.base[key] = lerp(tw.from[key], tw.to[key], k);
      if (u >= 1) { this.tween = null; tw.resolve(true); }
    }
    const p = this.final;
    // 场景叠加的偏移（被摸、让头、等待时歪头…）不直接跳到位，约 0.15 秒缓过去
    const ex = this._ex || (this._ex = {}), ke = Math.min(1, dt * 14);
    for (const key of POSE_KEYS) {
      const t = this.extra[key] || 0, c = ex[key] || 0;
      const n = Math.abs(t - c) < 0.01 ? t : c + (t - c) * ke;
      ex[key] = n; p[key] = this.base[key] + n;
    }

    // 位移
    const mv = this.mover;
    if (mv) {
      const step = mv.speed * dt;
      const remain = Math.abs(mv.x - this.x);
      const d = Math.min(step, remain);
      this.x += mv.dir * d;
      if (mv.y != null) { const tot = Math.abs(mv.x - mv.x0) || 1; this.y = lerp(mv.y0, mv.y, 1 - Math.abs(mv.x - this.x) / tot); }
      this.gait.phase += d / mv.cycleDist;
      this.applyTransform();
      if (remain - d < 0.5) { this.mover = null; mv.res(); }
    }
    if (this._driveT != null) { this._driveT -= dt; if (this._driveT <= 0) { this._driveT = null; this.gait.target = 0; } }
    // 步态
    const g = this.gait;
    g.w += (g.target - g.w) * Math.min(1, dt * 12);
    if (g.w > 0.01) this.applyGait(p, g);

    // 呼吸
    const br = Math.sin(this.t * 1.9);
    p.bodyY += br * 0.7; p.headY += Math.sin(this.t * 1.9 + 0.7) * 0.6; p.stretch += br * 0.004;
    // 眨眼
    if (this.autoBlink) {
      this.blinkT -= dt;
      if (this.blinkT <= 0 && this.blinkPhase < 0) { this.blinkPhase = 0; }
      if (this.blinkPhase >= 0) {
        this.blinkPhase += dt / 0.17;
        this.blinkV = Math.sin(Math.min(1, this.blinkPhase) * Math.PI);
        if (this.blinkPhase >= 1) { this.blinkPhase = -1; this.blinkV = 0; this.blinkT = Math.random() < 0.2 ? 0.18 : 2.4 + Math.random() * 3.2; }
      }
      p.blink = Math.max(p.blink, this.blinkV);
    }
    // 耳朵偶尔抖一下
    this.earT -= dt;
    if (this.earT <= 0) { this.earT = 3 + Math.random() * 5; this.earV = 1; this.earSide = Math.random() < 0.5 ? 'earL' : 'earR'; }
    if (this.earV > 0) { this.earV = Math.max(0, this.earV - dt * 5); p[this.earSide] += Math.sin(this.earV * Math.PI * 2) * 9; }
    // 视线
    const lk = this.look, ks = Math.min(1, dt * 9);
    const tg = this.touchLook && this.touchLook.on ? this.touchLook : lk;
    lk.turn += (tg.tTurn - lk.turn) * ks; lk.x += (tg.tx - lk.x) * ks; lk.y += (tg.ty - lk.y) * ks;
    p.turn += lk.turn; p.lookX += lk.x; p.lookY += lk.y;
    if (this.turnLead) p.turn = clamp(p.turn + this.turnLead, -1, 1);

    // 伸爪
    const r = this.reachS;
    if (r.t < 1) {
      r.t = Math.min(1, r.t + dt * 1000 / r.ms);
      r.w = lerp(r.from, r.to, r.t);
      if (r.t >= 1 && r.resolve) { const rs = r.resolve; r.resolve = null; rs(); }
    }
    if (r.w > 0.001) {
      r.tx += (r.gx - r.tx) * Math.min(1, dt * 14); r.ty += (r.gy - r.ty) * Math.min(1, dt * 14);
      this.applyReach(p, r);
    }
    this.rig.update(p, this.t);
  }

  applyGait(p, g) {
    const G = GAIT[g.kind], w = g.w, ph = g.phase;
    const foot = (off) => {
      const f = ((ph + off) % 1 + 1) % 1;
      if (f < G.duty) return [G.S / 2 - G.S * (f / G.duty), 0, 0, f];
      const u = (f - G.duty) / (1 - G.duty);
      return [-G.S / 2 + G.S * EASE.io(u), -G.lift * Math.sin(Math.PI * u), 18 * Math.sin(Math.PI * u) * (1 - u * 1.2), f];
    };
    const run = g.kind === 'run';
    const offs = run ? { hn: 0, hf: 0.12, fn: 0.5, ff: 0.62 } : { hn: 0, fn: 0.27, hf: 0.5, ff: 0.77 };
    const prev = this._prevFoot || {};
    for (const k of ['hn', 'fn', 'hf', 'ff']) {
      const [x, y, a, f] = foot(offs[k]);
      p[k + 'X'] += x * w; p[k + 'Y'] += y * w; p[k + 'A'] += a * w;
      if (prev[k] != null && f < prev[k] && w > 0.5 && this.onEvent) this.onEvent('step'); // 落脚
      prev[k] = f;
    }
    this._prevFoot = prev;
    const a2 = ph * Math.PI * 2;
    p.bodyY += Math.sin(a2 * 2) * G.bob * w;
    p.pitch += Math.sin(a2 * (run ? 1 : 2) + 0.8) * G.pitch * w;
    p.headY += Math.sin(a2 * 2 + 1.2) * (run ? 2 : 1.2) * w;
    p.headX += Math.sin(a2 * 2) * 0.8 * w;
    p.stretch += (run ? Math.sin(a2) * 0.06 : 0) * w;
    p.tailA += (8 + Math.sin(a2) * 5) * w;
    if (run) { p.earL -= 10 * w; p.earR -= 10 * w; p.headX += 4 * w; }
  }

  applyReach(p, r) {
    const w = EASE.io(clamp(r.w, 0, 1));
    const tx = r.tx, ty = r.ty + r.pat;
    const sx = 29 + p.bodyX, sy = -43 + p.bodyY;
    const dx = tx - sx, dy = ty - sy, dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const over = clamp(dist - 36, 0, 26);
    // 预备：重心先向后一点
    const anti = Math.sin(Math.PI * clamp(r.w * 2.4, 0, 1)) * (r.to > r.from ? 1 : 0.3);
    p.bodyX += (ux * over * 0.75) * w - 4 * anti;
    p.bodyY += clamp(uy * over * 0.5, -5, 12) * w + 2 * anti;
    p.pitch += clamp(-dy / 55, -0.5, 1) * 9 * w;
    p.stretch += 0.05 * w;
    p.shX += 6 * ux * w; p.shY += 4 * uy * w;
    p.headX += 4 * ux * w; p.headY += 2 * Math.max(0, uy) * w; p.tilt += 6 * w;
    p.lookX = lerp(p.lookX, ux * 1.5, w * 0.8); p.lookY = lerp(p.lookY, uy * 1.5, w * 0.8);
    p.tailA += 12 * w; p.tailCurl += 5 * w; p.hnX -= 3 * w;
    const lift = Math.sin(Math.PI * clamp(r.w, 0, 1)) * 9;
    p.fnX = lerp(p.fnX, tx - 33, w);
    p.fnY = lerp(p.fnY, ty + 6, w) - lift;
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    const pa = a <= 20 ? clamp(a, -85, 20) * 0.85 : Math.max(0, 17 - (a - 20) * 0.3);
    p.fnA = lerp(p.fnA, pa, w);
  }
}
