// 第一幕：拆开一份会动的礼物
// 画面是三层实拍质感的图叠出来的：最底下是「已经撕开、里面空着」的纸包；中间是探头的小猫（只在裂口里可见）；
// 最上面是「还没拆」的纸包，手指往下撕多少，就从它身上挖掉多少。撕完后它整个淡出，露出真正的撕口。
import { CONTENT } from '../content.js';
import { Stage, UI, h, esc, clamp, lerp, rng, Store, plate, motes } from '../core.js';
import { Audio } from '../audio.js';

const C = CONTENT.act1;
const BW = 319, BH = 295, CX = 153; // 纸包正面尺寸、撕拉条中线（按底图量的）
const PH = 843, K = 390 / 853;       // 底图在舞台上的高度、底图像素→舞台的比例
const KBOX = [150, 840, 550, 520];   // 探头小猫那一层在底图里的位置（像素）

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root;
    const gy = H - 165;              // 纸包底边 / 桌面
    const bx = 33, by = gy - BH;
    const py = H - PH;               // 底图顶边在舞台里的 y
    const S = ctx.s = { gy, bx, by, py, tipY: 0, wide: 0, done: false };
    const kx = KBOX[0] * K, ky = KBOX[1] * K, kw = KBOX[2] * K, kh = KBOX[3] * K;
    root.innerHTML = `
      <div class="world">
        ${plate('a1-open', '#1b2b22')}
        ${motes(14, [0, H - 760, 300, 460], 3)}
        <div class="a1-kwrap" style="top:${py}px"><img class="a1-kitten" src="assets/scene/a1-kitten.webp" alt="" style="left:${kx}px;top:${ky}px;width:${kw}px;height:${kh}px"></div>
        <svg class="a1-closed wiggle" style="top:${py}px" width="390" height="${PH}" viewBox="0 0 390 ${PH}">
          <defs><clipPath id="a1cut"><path class="cut" clip-rule="evenodd"/></clipPath>
          <filter id="a1soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
          <g clip-path="url(#a1cut)"><image href="assets/scene/a1-closed.webp" width="390" height="${PH}" preserveAspectRatio="none"/></g>
          <path class="holeShade" fill="none" stroke="#1a0d05" stroke-opacity=".55" stroke-width="5" filter="url(#a1soft)"/>
        </svg>
        <div class="a1-title" style="top:${Math.max(104, by - 236)}px;${by < 300 ? 'display:none' : ''}"><small>${esc(CONTENT.person.year)} · ${esc(CONTENT.person.birthdayShort)}</small>${esc(CONTENT.intro.title1)}<br>${esc(CONTENT.intro.title2)}</div>
        <div class="a1-tag" style="left:46px;top:${H - 524}px">${esc(CONTENT.intro.tagLine1)}<small>${esc(CONTENT.intro.tagLine2)}</small></div>
        <div class="polaroid a1-photo" style="left:${bx + 204}px;top:${by - 82}px"><img src="${esc(C.dropPhoto)}" alt=""></div>
        <svg class="a1-gift a1-front" style="left:${bx}px;top:${by}px;z-index:22;pointer-events:none" width="${BW}" height="${BH}" viewBox="0 0 ${BW} ${BH}" overflow="visible">
          <defs>
            <linearGradient id="a1curl" x1="0" x2="1"><stop offset="0" stop-color="#ead4ab"/><stop offset=".5" stop-color="#d7b988"/><stop offset="1" stop-color="#bf9862"/></linearGradient>
            <filter id="a1paper" x="-15%" y="-10%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .32  0 0 0 0 .2  0 0 0 0 .08  0 0 0 .35 -.05" result="g"/><feComposite in="g" in2="SourceAlpha" operator="in" result="gi"/><feDropShadow in="SourceGraphic" dx="0" dy="3" stdDeviation="3" flood-color="#140a03" flood-opacity=".5" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="gi"/></feMerge></filter>
            <pattern id="a1strip" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#f3e7cf"/><rect width="5" height="12" fill="#c4452f"/></pattern>
          </defs>
          <g class="curls" filter="url(#a1paper)"><path class="curlL" fill="url(#a1curl)"/><path class="curlR" fill="url(#a1curl)"/></g>
          <path class="curlL2" fill="#f4e3c0" opacity=".5"/><path class="curlR2" fill="#b08a55" opacity=".45"/>
          <g class="tabg" filter="url(#a1paper)">
            <path d="M-15 -6H15V22L6 33H-15Z" fill="url(#a1strip)"/>
            <path d="M-15 -6H15V22L6 33H-15Z" fill="#fff" opacity=".12"/>
            <path d="M15 22H6V33Z" fill="#d9c49a"/>
          </g>
        </svg>
        <img class="a1-pawimg" src="assets/scene/a1-paw.webp" alt="" style="left:${kx}px;top:${py + ky}px;width:${kw}px;height:${kh}px">
        <div class="a1-tab"></div>
      </div>`;
    const q = (s) => root.querySelector(s);
    S.world = q('.world'); S.gift = q('.a1-closed'); S.front = q('.a1-front');
    S.cut = q('.cut'); S.holeShade = q('.holeShade');
    S.curlL = q('.curlL'); S.curlR = q('.curlR'); S.curlL2 = q('.curlL2'); S.curlR2 = q('.curlR2');
    S.tabg = q('.tabg'); S.tab = q('.a1-tab'); S.photo = q('.a1-photo');
    S.kit = q('.a1-kitten'); S.paw = q('.a1-pawimg');
    S.gift.style.transformOrigin = `${bx + BW / 2}px ${PH - 165}px`;
    // 撕裂线：不规则的锯齿
    const r = rng(21);
    S.jag = [];
    for (let y = -2; y <= BH + 12; y += 9) S.jag.push({ y, x: CX + (r() - 0.5) * 11, l: (r() - 0.5) * 9, r: (r() - 0.5) * 9, c: 0.75 + r() * 0.5 });
    // 纸包里那只探头的小猫是从定调图里切下来的两层（头胸、爪）；侧身的骨骼小猫等它跳出来时再接手
    const cat = ctx.cat;
    cat.scale = 1.7;
    cat.mount(S.world); cat.el.style.zIndex = 26;
    cat.place(bx + 150, gy - 6, { facing: 1 });
    cat.setPose('stand'); cat.rig.showShadow(false); cat.el.style.opacity = 0;
    cat.rig.tone = { dir: [-1, -0.8], hi: 'rgba(255,200,130,.24)', lo: 'rgba(36,16,5,.42)', shadow: 16 };   // 左上方来的午后暖光
    this.kitten(ctx, { y: -84, dim: 1 }, 0);
    this.draw(ctx);
  },
  // 探头小猫的位置与明暗
  kitten(ctx, o, ms = 400, ease = 'cubic-bezier(.3,.8,.3,1)') {
    const S = ctx.s, k = S.kit;
    S.kst = Object.assign(S.kst || { y: 0, dim: 0, rot: 0, sc: 1 }, o);
    k.style.transition = ms ? `transform ${ms}ms ${ease}, filter ${Math.max(ms, 500)}ms` : 'none';
    k.style.transform = `translate3d(0,${S.kst.y}px,0) rotate(${S.kst.rot}deg) scale(${S.kst.sc})`;
    k.style.filter = S.kst.dim ? `brightness(${(0.92 - S.kst.dim * 0.66).toFixed(2)}) saturate(${(1 - S.kst.dim * 0.45).toFixed(2)})` : 'none';
    k.parentNode.classList.toggle('dim', !!S.kst.dim);
  },
  pawTo(ctx, o, ms = 400, ease = 'cubic-bezier(.3,.8,.3,1)') {
    const S = ctx.s, p = S.paw;
    S.pst = Object.assign(S.pst || { x: 10, y: 64, rot: -14, a: 0 }, o);
    p.style.transition = ms ? `transform ${ms}ms ${ease}, opacity ${Math.min(ms, 260)}ms` : 'none';
    p.style.transform = `translate3d(${S.pst.x}px,${S.pst.y}px,0) rotate(${S.pst.rot}deg)`; p.style.opacity = S.pst.a;
  },

  // 根据撕开进度重画裂口、卷边、封条
  draw(ctx) {
    const S = ctx.s, tip = S.tipY, wide = S.wide;
    const L = [], R = [], CL = [], CR = [];
    let tipX = CX;
    for (const j of S.jag) {
      if (j.y >= tip) { tipX = j.x; break; }
      const d = tip - j.y;
      let open = Math.min(130, d * 0.52 + 5.4 * Math.sqrt(d));
      open = lerp(open, 140 + j.c * 3, wide);
      const k = Math.min(1, d / 26);
      L.push([j.x - open + j.l * k, j.y]); R.push([j.x + open + j.r * k, j.y]);
      const cw = clamp(open * 0.2, 0, 17) * j.c * (1 - wide * 0.75);
      CL.push([j.x - open + j.l * k - cw, j.y]); CR.push([j.x + open + j.r * k + cw, j.y]);
    }
    const f = (n) => Math.round(n * 10) / 10;
    const poly = (pts) => pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' L');
    const ox = S.bx, oy = PH - 165 - BH;               // 纸包正面左上角在底图坐标里的位置
    const OUTER = `M${ox - 16},${oy - 34}H${ox + BW + 14}V${oy + BH + 10}H${ox - 16}Z`;   // 合上的纸包只盖纸包这一块（好让它单独晃一下）
    if (!L.length) {
      for (const e of [S.holeShade, S.curlL, S.curlR, S.curlL2, S.curlR2]) e.setAttribute('d', '');
      S.cut.setAttribute('d', OUTER);
      S.holePts = null;
    } else {
      const tipP = [tipX, tip + 3];
      const abs = (pts) => pts.map((p) => `${f(p[0] + ox)},${f(Math.max(-2, p[1]) + oy)}`).join(' L');
      const ring = `M${abs(L)} L${f(tipP[0] + ox)},${f(tipP[1] + oy)} L${abs(R.slice().reverse())} Z`;
      S.cut.setAttribute('d', OUTER + ' ' + ring);
      S.holeShade.setAttribute('d', `M${abs(L)} L${f(tipP[0] + ox)},${f(tipP[1] + oy)} L${abs(R.slice().reverse())}`);
      const mid = (a, b, t) => a.map((p, i) => [lerp(p[0], b[i][0], t), p[1]]);
      S.curlL.setAttribute('d', `M${poly(L)} L${f(tipP[0])},${f(tipP[1])} L${poly(CL.slice().reverse())} Z`);
      S.curlR.setAttribute('d', `M${poly(R)} L${f(tipP[0])},${f(tipP[1])} L${poly(CR.slice().reverse())} Z`);
      S.curlL2.setAttribute('d', `M${poly(mid(L, CL, 0.62))} L${f(tipP[0])},${f(tipP[1])} L${poly(CL.slice().reverse())} Z`);
      S.curlR2.setAttribute('d', `M${poly(mid(R, CR, 0.62))} L${f(tipP[0])},${f(tipP[1])} L${poly(CR.slice().reverse())} Z`);
      S.holePts = [...L, tipP, ...R.slice().reverse()];
    }
    S.tabg.setAttribute('transform', `translate(${f(tipX)} ${f(tip + 6)})`);
    S.tab.style.left = (S.bx + tipX) + 'px'; S.tab.style.top = (S.by + tip + 16) + 'px';
    // 黑漆漆的裂口里，先看见一张暗着的小脸和两只反着光的圆眼睛，跟着撕开的位置往下看
    if (!S.headFree) {
      const ty = clamp(tip - 150, -84, 34);
      if (!S.kst || S.kst.y !== ty) this.kitten(ctx, { y: ty, dim: 1 }, 0);
    }
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat, self = this, o = ctx.opts;
    // ---- 开场：要不要开声音（声音必须由用户主动开启） ----
    if (o.intro) {
      const I = CONTENT.intro, resumeAct = o.resumeAct;
      const NUM = ['一', '二', '三', '四', '五', '六', '七'];
      const ask = h(`<div class="a1-ask"><p>${esc(I.soundAsk)}</p><div class="row"><button class="btn primary" data-s="1" type="button">${esc(I.soundOn)}</button><button class="btn" data-s="0" type="button">${esc(I.soundOff)}</button></div>
        ${resumeAct ? `<div class="resume"><p>${esc(I.resume)}：第${NUM[resumeAct]}幕「${esc(CONTENT['act' + (resumeAct + 1)].title)}」</p><div class="row"><button class="btn small" data-r="go" type="button">${esc(I.resumeGo)}</button><button class="btn small" data-r="restart" type="button">${esc(I.resumeRestart)}</button></div></div>` : ''}</div>`);
      ctx.root.appendChild(ask);
      let sound = null, resume = null;
      await ctx.g(new Promise((res) => {
        ask.addEventListener('click', (e) => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.s != null) {
            sound = b.dataset.s === '1'; o.setSound(sound);
            ask.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('primary', x === b));
            if (!resumeAct) res();
          } else if (b.dataset.r) { resume = b.dataset.r; if (sound == null) o.setSound(false); res(); }
        });
      }));
      ask.remove();
      if (resume === 'go') { o.jumpTo(resumeAct); return; }
      if (resume === 'restart') { Store.reset(); }
      Audio.play('chime');
    }
    // ---- 纸包偶尔动一下 ----
    const thump = setInterval(() => { if (S.tipY < 4) Audio.play('thump'); }, 4200);
    ctx.onCleanup(() => clearInterval(thump));

    // ---- 撕：捏住封条的小角往下拉 ----
    const TARGET = 204, MAXT = 211;
    let resolveTorn; const torn = new Promise((r) => { resolveTorn = r; });
    let lastSfx = 0, grabDy = 0;
    const setTip = (v) => {
      v = clamp(v, S.tipY, MAXT);              // 只增不减：撕开的部分保留
      if (v === S.tipY) return;
      S.tipY = v;
      if (v - lastSfx > 7) { lastSfx = v; Audio.play('tear'); }
      self.draw(ctx);
      if (v >= TARGET && !S.done) { S.done = true; resolveTorn(); }
    };
    ctx.drag(S.tab, {
      start: (p) => { if (S.done) return false; grabDy = p[1] - (S.by + S.tipY); S.tab.classList.add('grabbed'); S.gift.classList.remove('wiggle'); UI.hint(null); },
      move: (p) => { if (!S.done) setTip(p[1] - S.by - grabDy); },
      end: () => { S.tab.classList.remove('grabbed'); if (!S.done) UI.hint(C.hintTear, C.altTear, autoTear); },
    });
    const autoTear = async () => {
      S.gift.classList.remove('wiggle'); UI.hint(null);
      const from = S.tipY, t0 = performance.now();
      const step = () => { if (!ctx.alive || S.done) return; const u = clamp((performance.now() - t0) / 1500, 0, 1); setTip(lerp(from, MAXT, u * u * (3 - 2 * u))); if (u < 1) requestAnimationFrame(step); };
      step();
    };
    await ctx.wait(o.intro ? 500 : 900);
    UI.hint(C.hintTear, C.altTear, autoTear);
    await ctx.g(torn);
    UI.hint(null);
    S.tab.classList.add('done'); S.tab.style.pointerEvents = 'none';
    // 撕下来的封条掉落；手撕出来的口子换成真正的撕口（合上的那层整个淡出）
    ctx.anim(S.tabg, [{ transform: S.tabg.getAttribute('transform').replace(/translate\(([\d.-]+) ([\d.-]+)\)/, 'translate($1px,$2px)') }, { transform: `translate(${CX + 50}px, ${BH + 60}px) rotate(120deg)`, opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.4,0,.9,.6)' });
    S.gift.style.transition = 'opacity .55s ease'; S.gift.style.opacity = 0;
    S.front.querySelectorAll('.curls, .curlL2, .curlR2').forEach((e) => { e.style.transition = 'opacity .5s'; e.style.opacity = 0; });

    // ---- 小猫探头：脸从暗处抬上来，前爪搭上纸边，停下来观察 ----
    await ctx.wait(450);
    S.headFree = true;
    self.kitten(ctx, { y: 0, dim: 0 }, 560, 'cubic-bezier(.3,1.5,.5,1)');
    await ctx.wait(560);
    Audio.play('meow');
    await ctx.wait(420);
    self.pawTo(ctx, { x: 0, y: 0, rot: 0, a: 1 }, 460, 'cubic-bezier(.2,.9,.3,1.2)');
    await ctx.wait(300);
    Audio.play('paper');
    await ctx.wait(420);
    self.kitten(ctx, { rot: 5, y: -3 }, 340); await ctx.wait(840); self.kitten(ctx, { rot: 0, y: 0 }, 320); await ctx.wait(320);
    ctx.root.querySelector('.a1-title').classList.add('gone');
    UI.caption(C.catLine);
    // 爪子的点击区
    const paw = h('<div class="a1-paw"></div>');
    const pcx = (150 + 222) * K, pcy = S.py + (840 + 412) * K;
    Object.assign(paw.style, { left: pcx - 80 + 'px', top: pcy - 52 + 'px', width: '160px', height: '104px' });
    S.world.appendChild(paw);
    let pawRes; const pawTap = new Promise((r) => { pawRes = r; });
    ctx.on(paw, 'click', () => pawRes());
    UI.hint(C.hintPaw, C.altPaw, () => pawRes());
    await ctx.g(pawTap);
    paw.remove(); UI.clear();
    Audio.play('pop');

    // ---- 被碰了一下：爪子缩一缩，然后它自己把剩下的纸扒开 ----
    self.pawTo(ctx, { y: -9, rot: 5 }, 150); self.kitten(ctx, { y: -5, sc: 1.02 }, 160);
    await ctx.wait(330);
    self.pawTo(ctx, { y: 0, rot: 0 }, 180); self.kitten(ctx, { y: 0, sc: 1 }, 180);
    await ctx.wait(260);
    Audio.play('rip');
    for (const [x, r] of [[-7, -4], [8, 5], [-5, -3], [0, 0]]) { self.kitten(ctx, { rot: r, y: -4 }, 110); self.pawTo(ctx, { x, rot: r * 2, y: 3 }, 110); await ctx.wait(115); }
    // 纸片飞落
    const rr = rng(7);
    for (let i = 0; i < 9; i++) {
      const sc = h('<div class="a1-scrap"></div>');
      const w = 14 + rr() * 26, hh = 10 + rr() * 22, x0 = S.bx + 20 + rr() * (BW - 40), y0 = S.by + 20 + rr() * 150;
      Object.assign(sc.style, { width: w + 'px', height: hh + 'px', left: x0 + 'px', top: y0 + 'px', clipPath: `polygon(${rr() * 30}% 0, 100% ${rr() * 40}%, ${70 + rr() * 30}% 100%, 0 ${60 + rr() * 40}%)`, background: i % 3 ? 'linear-gradient(120deg,#e6cfa3,#c9a877)' : 'linear-gradient(120deg,#c09a64,#a37b47)' });
      S.world.appendChild(sc);
      const dx = (x0 < S.bx + CX ? -1 : 1) * (40 + rr() * 90);
      sc.animate([{ transform: 'none' }, { transform: `translate(${dx * 0.6}px, -30px) rotate(${rr() * 200 - 100}deg)`, offset: 0.3 }, { transform: `translate(${dx}px, ${S.gy + 60 - y0}px) rotate(${rr() * 500 - 250}deg)`, opacity: 1, offset: 0.7 }, { transform: `translate(${dx}px, ${S.gy + 60 - y0}px) rotate(${rr() * 500 - 250}deg)`, opacity: 0 }], { duration: 1500 + rr() * 700, easing: 'cubic-bezier(.3,0,.7,1)', fill: 'forwards' });
    }
    await ctx.wait(260);

    // ---- 跳出来，碰落照片：探头的那层往里一缩，侧身的小猫从裂口跃出 ----
    const landX = S.bx + 96, landY = S.gy + 20;
    const ph = S.photo, phX = parseFloat(ph.style.left), phY = parseFloat(ph.style.top);
    const dropX = 252 - phX, dropY = (S.gy - 40) - phY;
    setTimeout(() => {
      if (!ctx.alive) return;
      ph.style.zIndex = 24; Audio.play('slide');
      ph.animate([
        { transform: 'rotate(8deg)' },
        { transform: `translate(26px,-22px) rotate(34deg)`, offset: 0.22, easing: 'cubic-bezier(.5,0,.9,.5)' },
        { transform: `translate(${dropX * 0.55}px, ${dropY}px) rotate(74deg)`, offset: 0.6, easing: 'cubic-bezier(.1,.6,.3,1)' },
        { transform: `translate(${dropX}px, ${dropY + 6}px) rotate(96deg)` },
      ], { duration: 1500, fill: 'forwards' });
    }, 330);
    self.kitten(ctx, { y: 26, sc: 0.96 }, 230, 'ease-in'); self.pawTo(ctx, { y: 40, a: 0 }, 220, 'ease-in');
    const jump = cat.jumpTo(landX, landY, { h: 64, ms: 500 });
    await ctx.wait(250);                                   // 下蹲预备的这一下由探头那层来演，蹬地的瞬间换成侧身小猫
    S.kit.style.transition = 'opacity .16s'; S.kit.style.opacity = 0;
    cat.el.style.transition = 'opacity .14s'; cat.el.style.opacity = 1;
    await ctx.g(jump);
    cat.rig.showShadow(true); cat.el.style.transition = '';
    await ctx.wait(200);
    // 小猫追过去，再回头等用户
    cat.lookAt(300, landY - 30);
    await ctx.g(cat.play('curious'));
    cat.lookAt(null);
    await ctx.g(cat.walkTo(186, { run: true }));
    await ctx.g(cat.play('stand'));
    await ctx.g(cat.reach(256, S.gy + 12, { ms: 300 })); await ctx.g(cat.pat(1, 6)); await ctx.g(cat.unreach(260));
    await ctx.g(cat.poseTo('lookBack', 380, 'out'));
    UI.hint(C.hintFollow);
    await UI.cta(ctx, C.follow);
    UI.clear();
    // 镜头跟随它进入下一幕
    await ctx.g(cat.poseTo('stand', 220));
    // 小猫低头把照片叼起来，带着它走向照相馆
    const pw = ph.offsetWidth, phh = ph.offsetHeight;
    const mouthT = () => { const hp = cat.joint('head'); const mx = hp[0] + 20 * cat.facing * cat.scale, my = hp[1] + 24 * cat.scale; return `translate(${mx - phX - pw / 2}px, ${my - phY - phh / 2}px) rotate(100deg) scale(.5)`; };
    await ctx.g(cat.reach(258, S.gy + 12, { ms: 240 })); cat.extra = { headY: 9, headX: 4 };
    await ctx.wait(160);
    Audio.play('paper');
    await ctx.anim(ph, [{ transform: `translate(${dropX}px, ${dropY + 6}px) rotate(96deg)` }, { transform: mouthT() }], { duration: 300, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'forwards' });
    ph.getAnimations().forEach((x) => x.cancel()); ph.style.transformOrigin = '50% 50%'; ph.style.zIndex = 27;
    let carrying = true; const loop = () => { if (!carrying || !ctx.alive) return; ph.style.transform = mouthT(); requestAnimationFrame(loop); }; loop();
    ctx.onCleanup(() => { carrying = false; });
    cat.extra = {}; await ctx.g(cat.unreach(200));
    cat.walkTo(520, { run: false, speed: 170 });
    await ctx.wait(900);
    return { type: 'pan' };
  },
};
