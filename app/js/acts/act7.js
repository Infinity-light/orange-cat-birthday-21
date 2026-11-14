// 第七幕：到达 21 岁的生日房间
import { CONTENT } from '../content.js';
import { UI, h, esc, clamp, Store, plate } from '../core.js';
import { Audio } from '../audio.js';
import { ITEM_ICONS } from './act5.js';
import { CAMERA_SVG } from './act2.js';
import { openAlbum, openKeepsake } from './album.js';

const C = CONTENT.act7;
const L = '#6a3b1f';

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root;
    const fy = H - 128;                                  // 小猫待的那条地板线
    const wallTop = Math.max(56, H - 692);               // 照片墙：从底图里那根空绳子往下挂
    const wallH = clamp(H - 446 - wallTop, 140, 250);
    const S = ctx.s = { fy, lit: 0, candles: 0, L: [0, 0, 0, 0] };
    // 三盏灯和蛋糕在底图里的位置（x，离底边的高度）
    S.lamps = [[45, H - 400], [195, Math.max(40, H - 780)], [352, H - 478]];
    S.cake = [193, H - 300];
    const photos = CONTENT.act2.photos, film = CONTENT.act3.nodes, T = CONTENT.act3.ticket, notes = CONTENT.act6.notes;
    const noteColors = ['#f3dd98', '#ecc6b0', '#cbdcc4', '#efe6d0'];
    root.innerHTML = `
      <div class="world">
        ${plate('a7-plate', '#1a1f14')}
        <div class="a7-wallbox ${wallH < 220 ? 'compact' : ''}" style="top:${wallTop}px;height:${wallH}px">
          <div class="grp g1">
            ${photos.map((p, i) => `<div class="polaroid a7-ph" style="left:${[5, 37, 69][i]}%;top:${[5, 7, 4][i]}%;transform:rotate(${[-5, 3, 6][i]}deg)"><img src="${esc(p.src)}" alt=""></div>`).join('')}
          </div>
          <div class="grp g2">
            <div class="a7-film" style="left:5%;top:${wallH > 230 ? 56 : 58}%">${film.map((f) => `<img src="${esc(f.src)}" alt="">`).join('')}</div>
            <div class="a7-ticket" style="left:38%;top:${wallH > 230 ? 83 : 85}%"><b>${esc(T.from)} → ${esc(T.to)}</b><span>${esc(T.no)} · ${esc(T.date)}</span></div>
          </div>
          <div class="grp g3">
            ${notes.map((n, i) => `<div class="a7-note" style="left:${[3, 14, 25, 8][i]}%;top:${[80, 84, 79, 96][i]}%;background:${noteColors[i]};transform:rotate(${[-6, 4, 3, -4][i]}deg)"><i></i><i></i><i></i></div>`).join('')}
          </div>
        </div>
        <div class="a7-flame f0" style="left:${180}px;top:${H - 319}px"></div>
        <div class="a7-flame f1" style="left:${207}px;top:${H - 319}px"></div>
        <div class="a7-cglow" style="left:${193}px;top:${H - 300}px"></div>
        <div class="a7-glow gl0" style="left:${45 - 150}px;top:${H - 400 - 150}px"></div>
        <div class="a7-glow gl1" style="left:15px;top:${Math.max(40, H - 780) - 150}px;width:360px"></div>
        <div class="a7-glow gl2" style="left:${352 - 150}px;top:${H - 478 - 150}px"></div>
        <div class="a7-dark"></div>
        <button type="button" class="a7-lamp" data-l="0" style="left:45px;top:${H - 400}px" aria-label="落地灯"></button>
        <button type="button" class="a7-lamp" data-l="1" style="left:195px;top:${Math.max(64, H - 780)}px" aria-label="灯串"></button>
        <button type="button" class="a7-lamp" data-l="2" style="left:352px;top:${H - 478}px" aria-label="壁灯"></button>
        <button type="button" class="a7-candle" data-c="0" style="left:${180}px;top:${H - 312}px" hidden aria-label="蜡烛 2"></button>
        <button type="button" class="a7-candle" data-c="1" style="left:${207}px;top:${H - 312}px" hidden aria-label="蜡烛 1"></button>
        <div class="a7-final ${H < 720 ? 'sm' : ''}" hidden style="top:${H < 720 ? 54 : 60}px;max-height:${fy - (H < 720 ? 160 : 190) - 60}px"><h2>${esc(C.blessing)}</h2><div class="lines">${C.final.map((t) => `<p>${esc(t)}</p>`).join('')}<em>${esc(C.sign)}</em></div><button type="button" class="a7-fold" hidden>收起，看看房间</button></div>
        <div class="a7-actions" hidden><button type="button" class="btn primary small" data-a="album">${esc(C.album)}</button><button type="button" class="btn small" data-a="card">${esc(C.card)}</button><button type="button" class="btn small" data-a="replay">${esc(C.replay)}</button></div>
      </div>`;
    S.world = root.querySelector('.world'); S.dark = root.querySelector('.a7-dark');
    this.darkMask(ctx);
    const cat = ctx.cat;
    cat.scale = 1.25; cat.mount(S.world); cat.el.style.zIndex = 9; cat.rig.showShadow(true); cat.setPose('stand');
    cat.rig.tone = { dir: [-0.6, -1], hi: 'rgba(255,196,120,.22)', lo: 'rgba(24,12,6,.44)', shadow: 8 };
    cat.place(-100, fy + 50, { facing: 1 });
    if (Store.data.finished && ctx.opts.jumped) S.revisit = true;
  },
  // 黑暗是盖在整间屋子（连小猫和照片墙）上面的一层夜色；哪盏灯亮了，就在那盏灯周围把夜色挖开
  darkMask(ctx) {
    const S = ctx.s, L = S.L, P = [...S.lamps, S.cake], R = [[190, 250], [300, 230], [190, 240], [150, 150]];
    const g = P.map((p, i) => `radial-gradient(ellipse ${R[i][0]}px ${R[i][1]}px at ${p[0]}px ${p[1]}px, rgba(0,0,0,${(1 - L[i]).toFixed(3)}) 0, rgba(0,0,0,${(1 - L[i] * 0.85).toFixed(3)}) 45%, #000 100%)`).join(',');
    S.dark.style.webkitMaskImage = g; S.dark.style.maskImage = g;
  },
  glowTo(ctx, i, v = 1, ms = 1100) {
    const S = ctx.s, from = S.L[i], t0 = performance.now(), self = this;
    const step = () => { if (!ctx.alive) return; const u = clamp((performance.now() - t0) / ms, 0, 1), k = 1 - Math.pow(1 - u, 3); S.L[i] = from + (v - from) * k; self.darkMask(ctx); if (u < 1) requestAnimationFrame(step); };
    step();
  },

  light(ctx, i, silent) {
    const S = ctx.s, root = ctx.root;
    if (root.classList.contains('lit' + i)) return false;
    root.classList.add('lit' + i); S.lit++;
    root.classList.add('n' + S.lit);
    this.glowTo(ctx, i);
    if (!silent) Audio.play('lamp');
    return true;
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat, self = this, root = ctx.root;
    await ctx.g(cat.walkTo(96, { speed: 150 }));
    cat.play('sit');
    // ---- 点亮几盏灯，照片墙逐渐显现 ----
    let allRes; const allLit = new Promise((r) => { allRes = r; });
    const lampPos = S.lamps;
    const doLight = (i) => { if (self.light(ctx, i)) { cat.lookAt(lampPos[i][0], lampPos[i][1]); if (S.lit >= 3) allRes(); } };
    root.querySelectorAll('.a7-lamp').forEach((b) => ctx.on(b, 'click', () => doLight(+b.dataset.l)));
    UI.hint(C.hintLamps, C.altLamps, async () => { for (let i = 0; i < 3; i++) { doLight(i); await new Promise((r) => setTimeout(r, 500)); } });
    await ctx.g(allLit);
    UI.hint(null);
    cat.lookAt(null); cat.play('happy');
    await ctx.wait(1200);
    UI.caption(C.recognise);
    Audio.duck(true);
    await ctx.wait(1400);
    // ---- 点亮蛋糕上的「21」蜡烛 ----
    let cRes; const candlesDone = new Promise((r) => { cRes = r; });
    const lightCandle = (i) => {
      if (root.classList.contains('cd' + i)) return;
      root.classList.add('cd' + i); S.candles++; Audio.play('candle'); self.glowTo(ctx, 3, S.candles / 2, 900);
      if (S.candles >= 2) cRes();
    };
    root.querySelectorAll('.a7-candle').forEach((b) => { b.hidden = false; ctx.on(b, 'click', () => lightCandle(+b.dataset.c)); });
    cat.lookAt(S.cake[0], S.cake[1]);
    UI.hint(C.hintCandles, C.altCandles, async () => { lightCandle(0); await new Promise((r) => setTimeout(r, 500)); lightCandle(1); });
    await ctx.g(candlesDone);
    UI.clear();
    root.querySelectorAll('.a7-candle').forEach((b) => { b.hidden = true; });
    root.classList.add('party');
    await ctx.wait(700);
    Audio.play('chime');
    // ---- 祝福与最终寄语；小猫趴下，留一点安静的时间 ----
    const fin = root.querySelector('.a7-final');
    fin.hidden = false; fin.classList.add('in');
    cat.lookAt(null);
    await ctx.g(cat.play('stand'));
    await ctx.g(cat.walkTo(122, { speed: 60 }));
    await ctx.g(cat.face(1));
    cat.play('sleep');
    setTimeout(() => { if (ctx.alive) { const z = h('<div class="a7-zzz"><i>z</i><i>z</i><i>z</i></div>'); z.style.left = (cat.x + 78) + 'px'; z.style.top = (cat.y - 92) + 'px'; S.world.appendChild(z); } }, 4200);
    const lines = fin.querySelectorAll('.lines > *');
    for (const ln of lines) { await ctx.wait(S.revisit ? 300 : 1900); ln.classList.add('in'); }
    Store.data.finished = true; Store.save();
    await ctx.wait(S.revisit ? 400 : 5200);                // 安静一会儿
    Audio.duck(false);
    const fold = fin.querySelector('.a7-fold'); fold.hidden = false;
    ctx.on(fold, 'click', () => { const m = fin.classList.toggle('mini'); fold.textContent = m ? '展开寄语' : '收起，看看房间'; Audio.play('paper'); });
    const act = root.querySelector('.a7-actions');
    act.hidden = false; act.classList.add('in');
    ctx.on(act, 'click', (e) => {
      const b = e.target.closest('button'); if (!b) return; Audio.play('tap');
      if (b.dataset.a === 'album') openAlbum();
      else if (b.dataset.a === 'card') openKeepsake(cat);
      else if (b.dataset.a === 'replay') window.__app.restart();
    });
    await ctx.g(new Promise(() => {}));                    // 停在这里，直到用户离开
  },
};
