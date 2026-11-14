// 第四幕：跟小猫重走几个地方（插画地图）
import { CONTENT } from '../content.js';
import { UI, h, esc, nl2br, clamp, lerp, Store, rng } from '../core.js';
import { Audio } from '../audio.js';
import { POSES } from '../cat/clips.js';

const C = CONTENT.act4;
const MW = 760, MH = 1130;
// 地图是一张实拍质感的「手作微缩小镇」底图（硬卡纸和木片做的模型，摆在一张米色地图纸上）。
// 下面的坐标都是在这张底图上量的：路线（红线折点）、小猫在每一站停下的位置、各处可以点的东西。
const START = [78, 1040];
const STANDS = [[232, 1040], [470, 803], [300, 562], [500, 335]];
const SHOP = [304, 199];
const LEGS = [
  [[232, 1040]],
  [[605, 1040], [605, 803], [470, 803]],
  [[148, 803], [148, 562], [300, 562]],
  [[612, 562], [612, 335], [500, 335]],
  [[333, 335], [333, 199], [304, 199]],
];
// 每一站：要点的东西在哪、点完出现的记录在哪、可以随手点着玩的东西在哪
const SPOT = {
  lib: { hit: [292, 990] },
  noodle: { hit: [530, 748], free: [453, 738, 'bowlon', 'pop'] },
  river: { hit: [381, 518], free: [240, 468, 'lampon', 'lamp'] },
  station: { hit: [498, 238], free: [597, 231, 'clockon', 'tick'] },
  shop: { door: [384, 142] },
};

function mapHtml() {
  const T = (x, y, w, txt, cls = '') => `<span class="a4-label ${cls}" style="left:${x}px;top:${y}px;width:${w}px">${esc(txt)}</span>`;
  return `<img class="a4-map" src="assets/scene/a4-map.webp" width="${MW}" height="${MH}" alt="" draggable="false">
  <div class="a4-above"></div>
  ${T(248, 15, 160, C.shop.name, 'red')}${T(482, 151, 71, '南站')}${T(432, 637, 128, '老周面馆', 'red')}${T(190, 892, 93, '图书馆', 'sm')}
  ${T(318, 163, 26, '21', 'red tiny')}
  ${T(20, 1086, 90, '梧 桐 里', 'road')}${T(640, 700, 90, '学 院 路', 'road')}${T(22, 400, 80, '小 清 河', 'road river')}${T(650, 322, 90, '站 前 街', 'road')}
  <div class="a4-b lib">
    <i class="fxwin" style="left:250px;top:965px;width:86px;height:50px"></i>
    <i class="fxglow" style="left:292px;top:985px;width:230px;height:230px"></i>
  </div>
  <div class="a4-b noodle">
    <i class="fxdoor" style="left:507px;top:716px;width:47px;height:64px"></i>
    <i class="fxglow sm" style="left:530px;top:770px;width:150px;height:110px"></i>
    <i class="fxsteam" style="left:520px;top:690px"></i><i class="fxsteam s2" style="left:538px;top:690px"></i>
    <i class="fxsteam bsteam" style="left:446px;top:716px"></i><i class="fxsteam bsteam s2" style="left:460px;top:716px"></i>
  </div>
  <div class="a4-b river">
    <i class="fxglow lamp" style="left:240px;top:468px;width:230px;height:230px"></i>
    <div class="polaroid benchphoto" style="left:364px;top:498px"><img src="${esc((C.places[2] && C.places[2].src) || '')}" alt=""></div>
    <div class="leaf" style="left:346px;top:491px"><img class="leafin" src="assets/scene/a4-leaf.webp" width="70" height="52" alt="" draggable="false"></div>
  </div>
  <div class="a4-b station">
    <div class="board-b" style="left:433px;top:215px;width:131px;height:46px"><span>K2101　屿城</span><span>2 站台　准点</span></div>
    <i class="hands" style="left:597px;top:231px"></i>
  </div>
  <div class="a4-b shop">
    <i class="fxglow shopglow" style="left:330px;top:120px;width:520px;height:440px"></i>
    <i class="fxwin" style="left:250px;top:95px;width:60px;height:57px"></i><i class="fxwin" style="left:366px;top:104px;width:38px;height:36px"></i>
    <i class="fxdoor" style="left:358px;top:97px;width:53px;height:89px"></i>
    <span class="bulbs">${[[242, 78], [267, 83], [291, 82], [317, 80], [342, 75], [365, 82], [390, 76], [412, 80]].map(([x, y], i) => `<i style="left:${x}px;top:${y}px;animation-delay:${-i * 0.37}s"></i>`).join('')}</span>
  </div>`;
}

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root;
    const S = ctx.s = { cam: [0, 0], camT: null, zoom: 1, idx: -1, seen: [] };
    root.innerHTML = `
      <div class="a4-view"><div class="a4-world" style="width:${MW}px;height:${MH}px">${mapHtml()}<div class="a4-night"></div><div class="a4-sky"></div><div class="a4-hits"></div></div></div>
      <div class="a4-dots">${C.places.map((p, i) => `<button type="button" data-i="${i}" disabled><i></i><span>${esc(p.name)}</span></button>`).join('')}</div>`;
    S.world = root.querySelector('.a4-world'); S.hits = root.querySelector('.a4-hits'); S.dots = root.querySelector('.a4-dots');
    const cat = ctx.cat;
    cat.scale = 0.86; cat.mount(S.world); cat.rig.showShadow(true); cat.setPose('stand');
    cat.rig.tone = { dir: [-1, -1], hi: 'rgba(255,220,170,.16)', lo: 'rgba(60,30,10,.28)', shadow: 12 };
    const saved = Store.data.sub.a4;
    S.resume = (ctx.opts.jumped && typeof saved === 'number' && saved >= 0) ? Math.min(saved, C.places.length - 1) : -1;
    const p0 = S.resume >= 0 ? STANDS[S.resume] : START;
    cat.place(p0[0] + (S.resume >= 0 ? 0 : 20), p0[1], { facing: 1 });
    if (S.resume < 0) S.zoom = 2.4;                    // 从车票上的路线拉远成地图
    this.camSnap(ctx);
    for (let i = 0; i < S.resume; i++) this.markSeen(ctx, i, true);
  },
  camTarget(ctx) {
    const S = ctx.s, cat = ctx.cat, H = ctx.H, z = S.zoom;
    const fx = S.focus ? S.focus[0] : cat.x, fy = S.focus ? S.focus[1] : cat.y - 86;
    const vw = 390 / z, vh = H / z;
    return [clamp(fx - vw / 2, 0, MW - vw), clamp(fy - vh * 0.56, -170, MH - vh)];
  },
  camApply(ctx) { const S = ctx.s; S.world.style.transform = `scale(${S.zoom}) translate3d(${-S.cam[0]}px,${-S.cam[1]}px,0)`; },
  camSnap(ctx) { ctx.s.cam = this.camTarget(ctx); this.camApply(ctx); },

  markSeen(ctx, i, silent) {
    const S = ctx.s; S.seen[i] = true;
    const b = S.dots.children[i]; b.disabled = false; b.classList.add('seen');
    const g = S.world.querySelector('.a4-b.' + ['lib', 'noodle', 'river', 'station'][i]); if (g) g.classList.add('done');
    if (silent && g) g.classList.add('nofx');
  },
  placeHtml(p) {
    let body = `<h3>${esc(p.title)}</h3>`;
    if (p.kind === 'photo') body += `<img class="ph" src="${esc(p.src)}" alt="">`;
    if (p.kind === 'video' && p.video) body += `<video class="ph vid" src="${esc(p.video)}" ${p.poster ? `poster="${esc(p.poster)}"` : ''} controls loop muted playsinline webkit-playsinline x5-playsinline x5-video-player-type="h5" preload="metadata"></video>`;
    if (p.chat) body += `<div class="chat">${p.chat.map((c) => `<div class="bubble ${c.me ? 'me' : ''}"><i>${esc(c.who)}</i><span>${esc(c.text)}</span></div>`).join('')}</div>`;
    if (p.text) body += p.text.split('\n\n').map((t) => `<p>${nl2br(t)}</p>`).join('');
    return `<div class="a4-place"><span class="a4-where">${esc(p.name)} · ${esc(p.sub)}</span>${body}</div>`;
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat, self = this, H = ctx.H;
    // 镜头始终跟着小猫
    let camOn = true;
    const camLoop = () => {
      if (!ctx.alive || !camOn) return;
      const t = self.camTarget(ctx);
      S.cam[0] += (t[0] - S.cam[0]) * 0.09; S.cam[1] += (t[1] - S.cam[1]) * 0.09;
      self.camApply(ctx); requestAnimationFrame(camLoop);
    };
    camLoop();
    const travel = async (pts) => { for (const p of pts) await ctx.g(cat.walkTo(p[0], { y: p[1], speed: 150 })); };
    const walkLeg = async (pts) => {
      for (const p of pts) {
        if (Math.abs(p[0] - cat.x) < 3) { // 竖直路段：左右不变，只走 y
          await ctx.g(new Promise((res) => {
            const y0 = cat.y, d = p[1] - y0, t0 = performance.now(), ms = Math.abs(d) / 150 * 1000;
            const step = () => { if (!ctx.alive) return res(); const u = clamp((performance.now() - t0) / ms, 0, 1); const ny = y0 + d * u; cat.gaitDrive(Math.abs(ny - cat.y)); cat.y = ny; cat.applyTransform(); if (u < 1) requestAnimationFrame(step); else res(); };
            step();
          }));
        } else await ctx.g(cat.walkTo(p[0], { y: p[1], speed: 150 }));
      }
    };
    // 回看：点上面的圆点
    ctx.on(S.dots, 'click', async (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled || S.reading) return;
      S.reading = true; Audio.play('tap');
      try { await UI.reader(ctx, { html: self.placeHtml(C.places[+b.dataset.i]), closeLabel: C.close }); } catch (er) { /* */ }
      S.reading = false;
    });

    const addHit = (x, y, cls = '') => { const b = h(`<button type="button" class="a4-hit ${cls}" style="left:${x}px;top:${y}px"></button>`); S.hits.appendChild(b); return b; };
    const EXP = [
      { hit: SPOT.lib.hit, arrive: async () => { await cat.play('sit'); cat.lookAt(SPOT.lib.hit[0], SPOT.lib.hit[1]); }, fx: 'lamp' },
      { hit: SPOT.noodle.hit, arrive: async () => { await cat.reach(STANDS[1][0] + 46, STANDS[1][1] - 26, { ms: 360 }); await cat.pat(2, 4); await cat.unreach(260); await cat.play('sit'); }, fx: 'door' },
      { hit: SPOT.river.hit, arrive: async () => { await cat.reach(STANDS[2][0] + 56, STANDS[2][1] - 30, { ms: 360 }); await cat.pat(2, 4); await cat.unreach(260); cat.lookAt(SPOT.river.hit[0], SPOT.river.hit[1]); }, fx: 'slide' },
      { hit: SPOT.station.hit, arrive: async () => { await cat.play('sit'); cat.lookAt(SPOT.station.hit[0], SPOT.station.hit[1]); }, fx: 'tick' },
    ];
    const KEYS = ['lib', 'noodle', 'river', 'station'];

    const visit = async (i, walked) => {
      const p = C.places[i], ex = EXP[i], g = S.world.querySelector('.a4-b.' + KEYS[i]);
      S.idx = i; Store.data.sub.a4 = i; Store.save();
      await ctx.g(ex.arrive());
      // 少量自由探索：路灯随时可以点
      const hit = addHit(ex.hit[0], ex.hit[1], 'explore');
      let exRes; const explored = new Promise((r) => { exRes = r; });
      if (i === 2) { // 树叶可以拖开
        let x0 = 0; ctx.drag(hit, { start: (pt) => { x0 = pt[0]; }, move: (pt) => { const dx = pt[0] - x0; g.querySelector('.leafin').style.transform = `translate(${dx}px,${-Math.abs(dx) * 0.2}px) rotate(${dx * 0.4}deg)`; if (Math.abs(dx) > 34) exRes(); }, end: () => { if (!S.seen[i]) g.querySelector('.leafin').style.transform = ''; } });
      }
      // 少量自由探索：路灯点一下会亮、面馆橱窗里的面会冒热气、车站的钟会走
      const FREE = { 1: SPOT.noodle.free, 2: SPOT.river.free, 3: SPOT.station.free };
      if (FREE[i] && !S['free' + i]) {
        const [fx, fy2, cls, snd] = FREE[i];
        const fh = S['free' + i] = addHit(fx, fy2, 'free');
        ctx.on(fh, 'click', () => { g.classList.toggle(cls); Audio.play(snd); fh.classList.add('seen'); if (cls === 'clockon') setTimeout(() => g.classList.remove(cls), 1300); });
      }
      ctx.on(hit, 'click', () => exRes());
      UI.hint(p.explore.hint, '帮我点一下', () => exRes());
      await ctx.g(explored);
      hit.remove(); UI.hint(null);
      Audio.play(ex.fx); g.classList.add('done');
      cat.play('happy');
      UI.caption(p.explore.done);
      await ctx.wait(900);
      // 记录出现：点开看
      const rec = addHit(ex.hit[0] - 6, ex.hit[1] - 58, 'record');
      rec.innerHTML = (p.kind === 'photo' || p.kind === 'video') && p.src ? `<span class="polaroid recph"><img src="${esc(p.src)}" alt="">${p.kind === 'video' ? '<b></b>' : ''}</span>` : `<span class="recnote ${p.kind === 'chat' ? 'chat' : ''}"><i></i><i></i><i></i></span>`;
      Audio.play('pop');
      const open = async () => { if (S.reading) return; S.reading = true; UI.clear(); try { await UI.reader(ctx, { html: self.placeHtml(p), closeLabel: C.close }); } finally { S.reading = false; } };
      let first; const firstRead = new Promise((r) => { first = r; });
      ctx.on(rec, 'click', async () => { Audio.play('tap'); await open(); rec.classList.add('seen'); first(); });
      UI.hint('点开' + p.name + '的记录', '帮我打开', () => rec.click());
      await ctx.g(firstRead);
      self.markSeen(ctx, i);
      if (i === 0) UI.caption(C.revisit);
      cat.lookAt(null);
      await UI.cta(ctx, i < C.places.length - 1 ? C.next : C.last);
      UI.clear();
      await ctx.g(cat.play('stand'));
    };

    const from = S.resume >= 0 ? S.resume : 0;
    if (S.resume < 0) {
      await ctx.wait(500);
      await ctx.g(new Promise((res) => { const t0 = performance.now(); const step = () => { if (!ctx.alive) return res(); const u = clamp((performance.now() - t0) / 1900, 0, 1); S.zoom = lerp(2.4, 1, u * u * (3 - 2 * u)); if (u < 1) requestAnimationFrame(step); else res(); }; step(); }));
      await ctx.wait(300);
    }
    for (let i = from; i < C.places.length; i++) {
      if (!(i === from && S.resume >= 0)) await walkLeg(LEGS[i]);
      await visit(i);
    }
    // ---- 最后：为生日亮灯的小店 ----
    const shopG = S.world.querySelector('.a4-b.shop'), night = S.world.querySelector('.a4-night');
    night.classList.add('on'); shopG.classList.add('lit');
    Audio.play('chime');
    await walkLeg(LEGS[4]);
    Store.data.sub.a4 = -1; Store.save();
    await ctx.g(cat.face(1));
    S.focus = [SHOP[0] + 40, SHOP[1] - 70];
    await ctx.g(cat.play('pushHold'));
    const door = addHit(SPOT.shop.door[0], SPOT.shop.door[1], 'explore');
    let dRes; const dTap = new Promise((r) => { dRes = r; });
    ctx.on(door, 'click', () => dRes());
    UI.hint(C.doorHint, C.altDoor, () => dRes());
    await ctx.g(dTap);
    door.remove(); UI.clear(); Audio.play('door');
    shopG.classList.add('open');
    await ctx.wait(500);
    cat.play('stand');
    cat.walkTo(SPOT.shop.door[0] - 8, { speed: 90 });
    await ctx.wait(350);
    // 镜头穿过门
    camOn = false;
    const dx = SPOT.shop.door[0], dy = SPOT.shop.door[1];
    S.world.style.transformOrigin = `${dx}px ${dy}px`;
    const cur = S.world.style.transform;
    cat.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 300, fill: 'forwards' });
    await ctx.anim(S.world, [{ transform: cur }, { transform: `translate3d(${195 - dx}px,${H * 0.5 - dy}px,0) scale(9)` }], { duration: 1100, easing: 'cubic-bezier(.6,0,.85,.5)' });
    return { type: 'veil', color: '#ffdf9c', ms: 200 };
  },
};
