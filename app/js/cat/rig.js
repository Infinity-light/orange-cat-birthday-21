// 小橘猫 · 画出来的分层素材 + 骨骼（Canvas）
// 骨骼和旧版完全一样（脊柱、IK 四肢、尾巴链），所以动作数据、接触点都不用改；
// 区别在「皮」：躯干、四肢、尾巴是从一张实拍质感的小猫侧身图上切下来的毛皮条带，沿骨骼弯曲贴上去；
// 头是单独一层；坐、趴睡这两个长时间停留的姿势直接换成整张姿势图（见 POSE_SPRITES）。
// 坐标：x 向右，y 向下，地面 y=0，小猫面朝 +x。

export const COLORS = { fur: '#E8923F', cream: '#FBEBD3', eye: '#1E130D' };

// 姿势参数（全部是相对静立姿势的偏移量）
export const BASE = {
  bodyX: 0, bodyY: 0,   // 躯干中心偏移
  pitch: 0,             // 躯干俯仰（度，正=前身抬起）
  stretch: 1,           // 脊柱伸缩
  arch: 0,              // 拱背(+)/塌腰(-)
  headX: 0, headY: 0,   // 头相对胸口的偏移
  tilt: 0,              // 歪头（度）
  turn: 0,              // 脸朝向：-1 回头 … 0 看镜头 … 1 朝前
  lookX: 0, lookY: 0,   // 眼神
  blink: 0,             // 0 睁 … 1 闭
  happy: 0,             // >0.5 眯眼笑
  mouth: 0,             // 张嘴
  earL: 0, earR: 0,     // 耳朵转动（度）
  fnX: 0, fnY: 0, fnA: 0, // 近侧前爪 位置偏移 / 爪角度
  ffX: 0, ffY: 0, ffA: 0, // 远侧前爪
  hnX: 0, hnY: 0, hnA: 0, // 近侧后爪
  hfX: 0, hfY: 0, hfA: 0, // 远侧后爪
  shX: 0, shY: 0,       // 近侧肩膀前伸
  tailA: 0,             // 尾根角度偏移（度）
  tailCurl: 0,          // 尾巴卷曲偏移（度/节）
  tailWave: 1,          // 尾巴摆动幅度
};
export const POSE_KEYS = Object.keys(BASE);

const D2R = Math.PI / 180;
export const DEFAULT_TONE = { dir: [-1, -1], hi: 'rgba(255,214,160,.14)', lo: 'rgba(40,18,6,.30)', shadow: 10 };
const VB = { x: -170, y: -205, w: 340, h: 250 };   // 画布覆盖的骨骼坐标范围
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function ik(ax, ay, tx, ty, l1, l2, dir) {
  let dx = tx - ax, dy = ty - ay;
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.05, min = Math.abs(l1 - l2) + 0.05;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < min) { dx *= min / d; dy *= min / d; d = min; }
  const a = Math.atan2(dy, dx);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const b = Math.acos(Math.max(-1, Math.min(1, c)));
  const ja = a + dir * b;
  return [ax + Math.cos(ja) * l1, ay + Math.sin(ja) * l1, ax + dx, ay + dy];
}

// ---------- 素材（所有小猫实例共用） ----------
const DIR = new URL('../../assets/cat/', import.meta.url).href;
const A = { ready: false, img: {}, waiters: [] };
const FILES = ['torso', 'head', 'legF', 'legH', 'tail', 'fur', 'lid', 'sit', 'sleep'];
function tint(img, color, alpha) {      // 生成一份压暗的副本（远侧的腿）
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.globalAlpha = alpha; g.fillRect(0, 0, c.width, c.height);
  return c;
}
export function loadCatAssets() {
  if (A.promise) return A.promise;
  A.promise = Promise.all(FILES.map((n) => new Promise((res) => {
    const im = new Image(); im.onload = () => { A.img[n] = im; res(); }; im.onerror = () => res(); im.src = DIR + n + '.webp';
  }))).then(() => {
    if (A.img.legF) A.img.legFfar = tint(A.img.legF, '#4a2410', 0.3);
    if (A.img.legH) A.img.legHfar = tint(A.img.legH, '#4a2410', 0.3);
    A.ready = !!(A.img.torso && A.img.head);
    A.waiters.splice(0).forEach((f) => f());
  });
  return A.promise;
}

// 整张姿势图：在骨骼坐标里的位置（x,y = 左上角；w = 宽；h 按图比例），eyes = 图内眼睛（比例坐标 cx,cy,rx,ry）
export const POSE_SPRITES = {
  sit: { img: 'sit', x: -72, w: 126, foot: 2.5, eyes: [[0.735, 0.265, 0.028, 0.028], [0.865, 0.269, 0.028, 0.028]] },
  sleep: { img: 'sleep', x: -92, w: 172, foot: 2.5, eyes: [] },
};

// 把一段毛皮条带沿折线贴上去。pts：密集的中线点；hw：半宽（骨骼单位）；u0..u1：用条带的哪一段（0..1）
function rope(g, img, pts, hw, u0 = 0, u1 = 1) {
  if (!img) return;
  const W = img.naturalWidth || img.width, Hh = img.naturalHeight || img.height;
  let total = 0; const cum = [0];
  for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(total); }
  if (total < 0.01) return;
  const m = (2 * hw) / Hh;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = cum[i + 1] - cum[i]; if (seg < 0.001) continue;
    const tx = (pts[i + 1][0] - pts[i][0]) / seg, ty = (pts[i + 1][1] - pts[i][1]) / seg;
    const nx = -ty, ny = tx;
    const sx = (u0 + (u1 - u0) * cum[i] / total) * W, sw = (u1 - u0) * seg / total * W;
    const k = seg / sw, pad = Math.min(W - sx - sw, 0.9 / k);          // 多画一点点，盖住相邻两片之间的缝
    g.save();
    g.transform(tx * k, ty * k, nx * m, ny * m, pts[i][0] - nx * hw, pts[i][1] - ny * hw);
    g.drawImage(img, sx, 0, sw + Math.max(0, pad), Hh, 0, 0, sw + Math.max(0, pad), Hh);
    g.restore();
  }
}
// 折线 → 拐角圆滑的密集点
function bend(P, f = 0.42) {
  const out = [P[0]];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 1; i < P.length - 1; i++) {
    const a = lerp(P[i], P[i - 1], f), b = lerp(P[i], P[i + 1], f);
    out.push(a);
    for (let k = 1; k <= 5; k++) { const t = k / 6, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * P[i][0] + t * t * b[0], u * u * a[1] + 2 * u * t * P[i][1] + t * t * b[1]]); }
    out.push(b);
  }
  out.push(P[P.length - 1]);
  return out;
}
function extend(pts, len) {    // 沿最后一段的方向再延长 len
  const a = pts[pts.length - 2], b = pts[pts.length - 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  pts.push([b[0] + (b[0] - a[0]) / d * len, b[1] + (b[1] - a[1]) / d * len]);
  return pts;
}

let uid = 0;

export class CatRig {
  constructor() {
    this.id = 'cat' + (++uid);
    const cv = this.svg = document.createElement('canvas');   // 名字沿用 svg：控制器只关心它是一个可以定位的元素
    cv.className = 'cat-svg';
    this.g = cv.getContext('2d');
    this.VB = VB; this.S = 0; this.setScale(1);
    this.clipPath = null; this.clipAll = false; this.shadow = true;
    this.flip = () => 1;           // 由控制器提供当前左右朝向（给点击判定用）
    this.joints = {}; this.spriteW = {}; this.alpha = 1;
    this.tone = null;              // 每一幕可以给小猫罩一层环境光：{ top:'rgba(..)', bottom:'rgba(..)' }
    // 兼容旧接口：头的屏幕位置（摸头、眼神跟手）
    this.gHead = { getBoundingClientRect: () => this.headRect() };
    loadCatAssets().then(() => { if (this._last) this.update(this._last, this._lastT); });
  }
  setScale(s) {
    const pr = Math.min(3, (window.devicePixelRatio || 1) * 1.15);
    const k = Math.round(s * pr * 100) / 100;
    if (k === this.S) return;
    this.S = k; this.svg.width = Math.ceil(VB.w * k); this.svg.height = Math.ceil(VB.h * k);
    if (this._last) this.update(this._last, this._lastT);
  }
  headRect() {
    const r = this.svg.getBoundingClientRect(), J = this.joints.head || [45, -83];
    if (!r.width) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    const u = (J[0] - VB.x) / VB.w, v = (J[1] + 6 - VB.y) / VB.h, hw = 34 / VB.w * r.width, hh = 34 / VB.h * r.height;
    const cx = this.flip() < 0 ? r.right - u * r.width : r.left + u * r.width, cy = r.top + v * r.height;
    return { left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh, width: hw * 2, height: hh * 2 };
  }
  setClip(d, all) { this.clipPath = d ? new Path2D(d) : null; this.clipAll = !!(d && all); if (this._last) this.update(this._last, this._lastT); }
  showShadow(v) { this.shadow = !!v; }
  toDataURL() { return this.svg.toDataURL('image/png'); }

  // 根据姿势更新骨骼并重画。time 用于尾巴摆动
  update(p, time = 0) {
    this._last = p; this._lastT = time;
    const J = this.joints;
    // ---- 骨骼（与旧版一致） ----
    const mx = p.bodyX, my = -49 + p.bodyY;
    const L = 28 * p.stretch, pr = p.pitch * D2R;
    const ux = Math.cos(pr), uy = -Math.sin(pr);
    const nx = uy, ny = -ux;
    const cx = mx + ux * L, cy = my + uy * L;
    const hx = mx - ux * L, hy = my - uy * L;
    const loc = (ox, oy, x, y) => [ox + x * ux + y * (-uy), oy + x * uy + y * ux];
    J.chest = [cx, cy]; J.hip = [hx, hy];
    const bcx = mx + nx * p.arch * 1.6, bcy = my + ny * p.arch * 1.6;
    const headX = cx + 17 + p.headX, headY = cy - 31 + p.headY;
    J.head = [headX, headY];
    // 尾巴链
    const tb = loc(hx, hy, -5, -10);
    let ang = (-152 + p.tailA) * D2R - pr;
    const tail = [tb];
    const N = 6, seg = 11.5;
    for (let i = 0; i < N; i++) {
      const w = Math.sin(time * 2.1 - i * 0.7) * 7 * p.tailWave * (0.4 + i * 0.16);
      ang += ((i === 0 ? 0 : 21 + p.tailCurl) + w) * D2R;
      const lp = tail[tail.length - 1];
      tail.push([lp[0] + Math.cos(ang) * seg, lp[1] + Math.sin(ang) * seg]);
    }
    J.tailTip = tail[N];
    // 前腿
    const front = (sh, tx, ty) => { const k = ik(sh[0], sh[1], tx, ty, 22, 22.5, 1); const e = [k[0] * 0.6 + (sh[0] + k[2]) * 0.2, k[1] * 0.6 + (sh[1] + k[3]) * 0.2]; return { pts: [sh, e, [k[2], k[3]]], paw: [k[2], k[3], Math.atan2(k[3] - k[1], k[2] - k[0])] }; };
    const shN = loc(cx, cy, 1 + p.shX, 9 + p.shY), shF = loc(cx, cy, 8, 7);
    J.shoulderN = shN;
    const fN = front(shN, 34 + p.fnX, -1.5 + p.fnY), fF = front(shF, 44 + p.ffX, -2 + p.ffY);
    J.pawFN = fN.paw; J.pawFF = fF.paw;
    // 后腿
    const hind = (hj, tx, ty, pa) => {
      const a = pa * D2R;
      const hk = [tx - 6 * Math.cos(a) + 10 * Math.sin(a), ty - 6 * Math.sin(a) - 10 * Math.cos(a)];
      const k = ik(hj[0], hj[1], hk[0], hk[1], 19, 18, -1);
      const dx = k[2] - hk[0], dy = k[3] - hk[1];
      const ttx = tx + dx, tty = ty + dy;
      const kn = [k[0] * 0.55 + (hj[0] + k[2]) * 0.225, k[1] * 0.55 + (hj[1] + k[3]) * 0.225];
      const hc = [k[2] * 0.7 + (kn[0] + ttx) * 0.15, k[3] * 0.7 + (kn[1] + tty) * 0.15];
      return { pts: [hj, kn, hc, [ttx, tty]], paw: [ttx, tty, k[0], k[1]] };
    };
    const hjN = loc(hx, hy, -1, 8), hjF = loc(hx, hy, 6, 6);
    const hN = hind(hjN, -30 + p.hnX, -3 + p.hnY, p.hnA), hF = hind(hjF, -20 + p.hfX, -3.5 + p.hfY, p.hfA);
    J.pawHN = hN.paw; J.pawHF = hF.paw;

    if (!A.ready) return J;
    // ---- 画 ----
    const g = this.g, k = this.S, I = A.img;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.svg.width, this.svg.height);
    if (this.alpha <= 0.001) return J;
    g.setTransform(k, 0, 0, k, -VB.x * k, -VB.y * k);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

    // 整张姿势图的权重（坐 / 趴睡）
    const wSit = this.noSprites ? 0 : sstep(0.5, 0.85, 1 - (Math.abs(p.pitch - 44) / 26 + Math.abs(p.bodyY - 15) / 14 + Math.abs(p.fnX + 19) / 30) / 2) * (p.fnY > -8 ? 1 : 0);
    const wLie = this.noSprites ? 0 : sstep(0.45, 0.8, 1 - (Math.abs(p.bodyY - 27.5) / 10 + Math.abs(p.pitch - 1) / 12 + Math.abs(p.fnX - 43) / 30) / 2.2);
    const wSpr = Math.max(wSit, wLie);
    const puppetA = 1 - sstep(0.5, 0.92, wSpr);

    if (puppetA > 0.01) {
      g.globalAlpha = puppetA;
      const clipOn = (fn) => { if (this.clipPath) { g.save(); g.clip(this.clipPath); fn(); g.restore(); } else fn(); };
      const tailPts = bend(tail, 0.5);
      const legPts = (o, paw) => extend(bend(o.pts, 0.48), paw);
      const drawBack = () => { rope(g, I.tail, tailPts, 8.8); rope(g, I.legHfar, legPts(hF, 3.5), 11.5); };
      const drawFarFront = () => rope(g, I.legFfar, legPts(fF, 1), 10.8);
      const drawBody = () => {
        // 躯干：沿脊柱曲线贴，首尾各多出一截（臀、胸）
        const st = p.stretch, s0 = -38 * st, s1 = 60.5 * st, n = 16, sp = [];
        const t0 = [2 * (bcx - hx), 2 * (bcy - hy)], t1 = [2 * (cx - bcx), 2 * (cy - bcy)];
        const l0 = Math.hypot(t0[0], t0[1]) || 1, l1 = Math.hypot(t1[0], t1[1]) || 1;
        for (let i = 0; i <= n; i++) {
          const s = s0 + (s1 - s0) * i / n;
          if (s < -L) sp.push([hx + t0[0] / l0 * (s + L), hy + t0[1] / l0 * (s + L)]);
          else if (s > L) sp.push([cx + t1[0] / l1 * (s - L), cy + t1[1] / l1 * (s - L)]);
          else { const t = (s + L) / (2 * L), u = 1 - t; sp.push([u * u * hx + 2 * u * t * bcx + t * t * cx, u * u * hy + 2 * u * t * bcy + t * t * cy]); }
        }
        rope(g, I.torso, sp, 21.2);
        rope(g, I.legH, legPts(hN, 3.5), 11.5);
      };
      const drawNeck = () => {
        const c0 = loc(cx, cy, 2, -3), h1 = [headX + 1, headY + 12];
        rope(g, I.fur, [c0, [(c0[0] + h1[0]) / 2 + 2, (c0[1] + h1[1]) / 2], h1], 15);
      };
      if (this.clipAll) clipOn(() => { drawBack(); drawFarFront(); drawBody(); drawNeck(); rope(g, I.legF, legPts(fN, 1), 10.8); this.drawHead(g, p, headX, headY); });
      else {
        clipOn(drawBack); drawFarFront(); clipOn(drawBody); drawNeck();
        rope(g, I.legF, legPts(fN, 1), 10.8);
        this.drawHead(g, p, headX, headY);
      }
    }
    // 整张姿势图
    const spr = wSit >= wLie ? POSE_SPRITES.sit : POSE_SPRITES.sleep;
    if (wSpr > 0.01 && I[spr.img]) {
      const im = I[spr.img], w = spr.w, hh = w * im.naturalHeight / im.naturalWidth;
      const br = Math.sin(time * 1.9) * 0.006;                         // 呼吸：上半身极轻微起伏
      g.globalAlpha = sstep(0, 0.7, wSpr);
      const ox = spr.x + (p.bodyX - (wSit >= wLie ? -8 : 0)) * 0.3, oy = spr.foot - hh;
      g.save(); g.translate(ox + w / 2, oy + hh); g.scale(1 - br * 0.5, 1 + br); g.drawImage(im, -w / 2, -hh, w, hh); g.restore();
      // 闭眼 / 眯眼
      const bl = Math.max(clamp(p.blink, 0, 1), p.happy > 0.5 ? 0.85 : 0);
      if (bl > 0.02 && spr.eyes.length) for (const e of spr.eyes) this.lid(g, ox + e[0] * w, oy + e[1] * hh, e[2] * w, e[3] * w, bl);
    }
    g.globalAlpha = 1;
    // 环境光：只染到已经画出来的小猫身上
    // tone.dir 是屏幕上「光从哪边来」（x<0 = 左上方来光）；小猫转身时画布是镜像的，所以这里按朝向把方向翻回去
    const tone = this.tone || DEFAULT_TONE, fl = this.flip() < 0 ? -1 : 1;
    const dx = tone.dir[0] * fl, dy = tone.dir[1], dl = Math.hypot(dx, dy) || 1, ccx = mx + 8, ccy = -52, rr = 78;
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(ccx + dx / dl * rr, ccy + dy / dl * rr, ccx - dx / dl * rr, ccy - dy / dl * rr);
    gr.addColorStop(0, tone.hi); gr.addColorStop(0.42, 'rgba(0,0,0,0)'); gr.addColorStop(1, tone.lo);
    g.fillStyle = gr; g.fillRect(VB.x, VB.y, VB.w, VB.h);
    const gb = g.createLinearGradient(0, -34, 0, 4); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, tone.ground || 'rgba(30,14,6,.22)');   // 贴地的一圈再压暗一点，脚才站得住
    g.fillStyle = gb; g.fillRect(VB.x, -34, VB.w, 40);
    // 接触阴影：画在小猫下面
    if (this.shadow) {
      g.globalCompositeOperation = 'destination-over';
      const sx = (wSpr > 0.5 ? (wSit >= wLie ? 6 : 4) : mx + 2) - dx / dl * (tone.shadow || 10), rx = wSpr > 0.5 && wLie > wSit ? 76 : 58;
      g.save(); g.translate(sx, 1.5); g.scale(1, 0.15);
      const sg = g.createRadialGradient(0, 0, 4, 0, 0, rx); sg.addColorStop(0, 'rgba(20,10,4,.5)'); sg.addColorStop(0.6, 'rgba(20,10,4,.26)'); sg.addColorStop(1, 'rgba(20,10,4,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    return J;
  }

  drawHead(g, p, headX, headY) {
    const im = A.img.head; if (!im) return;
    const turn = clamp(p.turn, -1, 1);
    const HW = 59, sc = HW / im.naturalWidth, HH = im.naturalHeight * sc;
    const cxr = 0.478, cyr = 0.551;                                 // 头的转动中心在素材里的位置
    g.save();
    g.translate(headX + 1 + turn * 5.5 + p.lookX * 1.1, headY + 9 + p.lookY * 1.0);
    g.rotate(p.tilt * D2R);
    g.transform(1 - 0.16 * Math.abs(turn), 0, 0, 1, 0, 0);
    g.drawImage(im, -HW * cxr, -HH * cyr, HW, HH);
    const bl = Math.max(clamp(p.blink, 0, 1), p.happy > 0.5 ? 0.85 : 0);
    if (bl > 0.02) {
      const f = sc * im.naturalWidth / 450;                           // 眼睛坐标是按 450 宽的原始裁切量的
      for (const e of [[157, 251, 31, 30], [277, 254, 31, 30]]) this.lid(g, -HW * cxr + e[0] * f, -HH * cyr + e[1] * f, e[2] * f, e[3] * f, bl);
    }
    g.restore();
  }
  // 眼皮：一块额头的毛从上往下盖住眼睛
  lid(g, cx, cy, rx, ry, b) {
    const im = A.img.lid; if (!im) return;
    g.save();
    g.beginPath(); g.ellipse(cx, cy, rx * 1.08, ry * 1.1, 0, 0, 7); g.clip();
    const top = cy - ry * 1.1, hgt = ry * 2.2 * b;
    g.drawImage(im, cx - rx * 1.2, top - (ry * 2.2 - hgt), rx * 2.4, ry * 2.2);
    g.strokeStyle = 'rgba(70,34,14,.6)'; g.lineWidth = Math.max(0.4, ry * 0.13); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - rx * 1.05, top + hgt - ry * 0.12); g.quadraticCurveTo(cx, top + hgt + ry * 0.3, cx + rx * 1.05, top + hgt - ry * 0.12); g.stroke();
    g.restore();
  }
}
