// 第二幕：小猫照相馆
import { CONTENT } from '../content.js';
import { UI, h, esc, nl2br, clamp, lerp, Store, plate, motes } from '../core.js';
import { Audio } from '../audio.js';

const C = CONTENT.act2;

export const CAMERA_SVG = `
<svg class="a2-cam" width="210" height="170" viewBox="0 0 210 170" overflow="visible">
  <ellipse cx="105" cy="156" rx="112" ry="10" fill="#3b2412" opacity=".28"/>
  <rect class="shutter" x="158" y="9" width="32" height="20" rx="7" fill="#d2553d" stroke="#6a3b1f" stroke-width="2"/>
  <rect x="62" y="8" width="84" height="26" rx="9" fill="#efe2c6" stroke="#6a3b1f" stroke-width="2"/>
  <rect x="5" y="24" width="200" height="130" rx="20" fill="#f8efdc" stroke="#6a3b1f" stroke-width="2.200"/>
  <path d="M6 104H204v10H6z" fill="#d2553d"/><path d="M6 114H204v8H6z" fill="#f29a3f"/><path d="M6 122H204v8H6z" fill="#f2c94d"/><path d="M6 130H204v7H6z" fill="#3a6254"/>
  <rect x="5" y="24" width="200" height="130" rx="20" fill="none" stroke="#6a3b1f" stroke-width="2.200"/>
  <circle cx="105" cy="86" r="47" fill="#f8efdc" stroke="#6a3b1f" stroke-width="2.200"/>
  <circle cx="105" cy="86" r="39" fill="#3b2a22"/><circle cx="105" cy="86" r="29" fill="#26324a"/><circle cx="105" cy="86" r="17" fill="#121826"/>
  <circle cx="95" cy="76" r="7" fill="#fff" opacity=".55"/><circle cx="114" cy="96" r="3" fill="#fff" opacity=".35"/>
  <rect class="flash" x="20" y="38" width="42" height="28" rx="6" fill="#e3ecee" stroke="#6a3b1f" stroke-width="2"/>
  <path d="M27 45h28M27 52h28M27 59h28" stroke="#b9c8cc" stroke-width="2"/>
  <rect x="154" y="40" width="32" height="24" rx="5" fill="#26324a" stroke="#6a3b1f" stroke-width="2"/><rect x="159" y="44" width="10" height="7" rx="2" fill="#fff" opacity=".4"/>
  <rect x="36" y="141" width="138" height="9" rx="4" fill="#2a1a10"/>
</svg>`;

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root;
    const gy = H - 227;                                   // 桌面上相机脚下那条线（按底图量的）
    const S = ctx.s = { gy, camX: 37, camY: H - 380, pile: [] };
    root.innerHTML = `
      <div class="world">
        ${plate('a2-plate', '#16241c')}
        ${motes(12, [10, H - 760, 300, 480], 5)}
        <div class="a2-sign" style="top:${H - 606}px"><span>${esc(C.title)}</span><small>今日显影 · 三张</small></div>
        <div class="polaroid a2-old" style="left:240px;top:${H - 338}px"><img src="${esc(CONTENT.act1.dropPhoto)}" alt=""></div>
        <div class="a2-camwrap" style="left:${S.camX}px;top:${S.camY}px">
          <div class="a2-slot"><div class="polaroid a2-eject"><img alt=""></div></div>
          <div class="a2-slotlip"></div>
          <div class="a2-flashfx"></div>
          <div class="a2-shutterfx"></div>
        </div>
        <div class="a2-pile"></div>
      </div>
      <div class="a2-white"></div>`;
    S.world = root.querySelector('.world');
    S.eject = root.querySelector('.a2-eject'); S.slot = root.querySelector('.a2-slot');
    S.white = root.querySelector('.a2-white'); S.camwrap = root.querySelector('.a2-camwrap');
    const cat = ctx.cat;
    cat.scale = 1.4; cat.mount(S.world); cat.el.style.zIndex = 12; cat.rig.showShadow(true);
    cat.setPose('stand');
    cat.rig.tone = { dir: [-1, -0.8], hi: 'rgba(255,200,130,.22)', lo: 'rgba(36,16,5,.40)', shadow: 14 };
    S.catX = 318; S.catY = gy + 30;
    cat.place(-110, S.catY, { facing: 1 });
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat;
    // 小猫走进来，绕到相机右边
    cat.el.style.zIndex = 12;
    // 小猫走进来，跳上相机——前爪正好踩在快门上
    const topX = 124, topY = ctx.H - 366;                 // 相机顶；前爪落在红色快门上
    const PRESS = { bodyX: 5, bodyY: 2, pitch: 2, fnX: 14, fnY: -6, fnA: 4, shX: 2, headX: 4, headY: 4, lookX: 1.2, lookY: 1.2 };
    const LIFT = { bodyX: 2, pitch: 6, fnX: 12, fnY: -22, fnA: 10, shY: -2, headX: 2, lookX: 1.2, lookY: 0.6 };
    await ctx.g(cat.walkTo(20, { speed: 200, y: S.catY }));
    await ctx.wait(150);

    const start = (ctx.opts.jumped && Store.data.sub.a2 > 0) ? Math.min(Store.data.sub.a2, C.photos.length - 1) : 0;
    for (let k = 0; k < start; k++) this.keepSmall(ctx, C.photos[k], k);
    for (let i = start; i < C.photos.length; i++) {
      const ph = C.photos[i], last = i === C.photos.length - 1;
      Store.data.sub.a2 = i; Store.save();
      // ---- 小猫踩快门 ----
      S.eject.querySelector('img').src = ph.src;
      S.eject.classList.add('undeveloped');
      S.eject.style.transition = 'none'; S.eject.style.transform = 'translateY(-170px)';
      S.eject.style.opacity = 1;
      UI.hint(C.hintShutter);
      if (i === start) {
        const landed = cat.jumpTo(topX, topY, { h: 80, ms: 520, end: PRESS });
        await ctx.wait(230 + 80 + 520);           // 下蹲 + 蹬地 + 腾空，落地那一下踩到快门
        landed.then(() => {});
      } else {
        await ctx.g(cat.play('stand'));
        await ctx.g(cat.poseTo(LIFT, 260, 'out'));
        await ctx.wait(140);
        await ctx.g(cat.poseTo(PRESS, 110, 'in'));
      }
      Audio.play('shutter');
      S.camwrap.classList.add('pressed');
      S.white.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.15 }, { opacity: 0 }], { duration: 520 });
      await ctx.wait(200);
      S.camwrap.classList.remove('pressed');
      Audio.play('whirr');
      S.eject.style.transition = 'transform .9s cubic-bezier(.3,.1,.3,1)'; S.eject.style.transform = 'translateY(-118px)';
      await ctx.wait(500);
      cat.poseTo('stand', 300);
      await ctx.wait(450);
      cat.lookAt(S.camX + 92, S.camY + 220);
      // ---- 用户亲手把照片抽出来 ----
      let pulledRes; const pulled = new Promise((r) => { pulledRes = r; });
      let y0 = 0, off = 0, done = false;
      const setOff = (v) => { off = clamp(v, 0, 118); S.eject.style.transition = 'none'; S.eject.style.transform = `translateY(${-118 + off}px)`; };
      const finish = () => { if (done) return; done = true; S.eject.style.transition = 'transform .3s ease-out'; S.eject.style.transform = 'translateY(0)'; Audio.play('slide'); setTimeout(pulledRes, 320); };
      const undrag = ctx.drag(S.slot, {
        start: (p) => { if (done) return false; y0 = p[1] - off; },
        move: (p) => { if (done) return; const prev = off; setOff(p[1] - y0); if (Math.abs(off - prev) > 0.5 && Math.random() < 0.2) Audio.play('scratch', 0.6); if (off > 84) finish(); },
        end: () => { if (!done && off > 46) finish(); else if (!done) { S.eject.style.transition = 'transform .3s'; S.eject.style.transform = 'translateY(-118px)'; off = 0; } },
      });
      UI.hint(C.hintPull, C.altPull, finish);
      await ctx.g(pulled);
      undrag(); UI.hint(null);
      cat.lookAt(null);
      cat.play('sit');
      await this.readPhoto(ctx, ph, i, last);
      if (!last) { await ctx.g(cat.play('stand')); await ctx.wait(200); }
    }
    Store.data.sub.a2 = 0; Store.save();
    return await this.filmOut(ctx);
  },
  keepSmall(ctx, ph, i) {
    const S = ctx.s, px = 22 + i * 62, py = S.gy + 26, rot = [-8, 6][i] || 0;
    S.world.querySelector('.a2-pile').appendChild(h(`<div class="polaroid a2-kept" style="left:${px}px;top:${py}px;transform:rotate(${rot}deg)"><img src="${esc(ph.src)}" alt=""></div>`));
  },

  // 照片阅读：显影 → 文字 → 可翻面、可点小物件 → 用户自己收好
  async readPhoto(ctx, ph, i, last) {
    const S = ctx.s, H = ctx.H;
    const top = clamp((H - 500) / 2, 58, 140);
    const el = h(`<div class="a2-reader">
      <div class="a2-scrim"></div>
      <div class="a2-card" style="top:${top}px">
        <div class="a2-flip">
          <div class="face front">
            <div class="imgwrap"><img src="${esc(ph.src)}" alt=""><button class="hot" type="button" aria-label="${esc(ph.hotspot.label)}" style="left:${ph.hotspot.x * 100}%;top:${ph.hotspot.y * 100}%" hidden></button></div>
            <div class="meta"><span class="date">${esc(ph.date)}</span><p class="cap">${esc(ph.caption)}</p></div>
          </div>
          <div class="face back">
            <span class="date">${esc(ph.date)} · 背面</span>
            <p>${nl2br(ph.back)}</p>
            <span class="a2-stamp">小猫照相馆<br>显影 · 第 ${i + 1} 张</span>
            ${ph.hasFilm ? `<div class="filmclip"><svg width="120" height="64" viewBox="0 0 120 64"><rect x="0" y="14" width="112" height="40" fill="#2a1a10"/><g fill="#fbf3e2">${Array.from({ length: 9 }, (_, k) => `<rect x="${5 + k * 12}" y="17" width="6" height="4" rx="1"/><rect x="${5 + k * 12}" y="47" width="6" height="4" rx="1"/>`).join('')}</g><g fill="#b9763a" opacity=".85"><rect x="6" y="24" width="30" height="20"/><rect x="41" y="24" width="30" height="20"/><rect x="76" y="24" width="30" height="20"/></g><path d="M86 4v40a9 9 0 0 0 18 0V10a6 6 0 0 0-12 0v30" fill="none" stroke="#8d99a3" stroke-width="3" stroke-linecap="round"/></svg></div>` : ''}
          </div>
        </div>
      </div>
      <div class="a2-note" hidden><b></b><p></p><button type="button" class="btn small">知道了</button></div>
      <div class="a2-btns" style="top:${top + 418}px"><button type="button" class="btn" data-a="flip" hidden>${esc(C.flip)}</button><button type="button" class="btn primary" data-a="keep" hidden>${esc(last ? C.keepLast : C.keep)}</button></div>
    </div>`);
    ctx.root.appendChild(el);
    ctx.onCleanup(() => el.remove());
    const card = el.querySelector('.a2-card'), flip = el.querySelector('.a2-flip'), img = el.querySelector('img');
    const hot = el.querySelector('.hot'), note = el.querySelector('.a2-note');
    const bFlip = el.querySelector('[data-a=flip]'), bKeep = el.querySelector('[data-a=keep]');
    // 从出片口飞到中间
    const sx = S.camX + 32 + 60 - 195, sy = S.camY + 138 + 75 - (top + 200);
    S.eject.style.opacity = 0;
    Audio.duck(true);
    await ctx.anim(card, [{ transform: `translate(${sx}px,${sy}px) scale(.4) rotate(-4deg)` }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.2,.8,.3,1)' });
    // 显影
    UI.hint(C.hintDevelop);
    img.classList.add('developing');
    await ctx.wait(3300);
    UI.hint(null);
    el.classList.add('developed');
    await ctx.wait(700);
    hot.hidden = false; bFlip.hidden = false;
    if (!last) bKeep.hidden = false;
    UI.hint(C.hotspotHint);
    let flipped = false, seenBack = false;
    const doFlip = () => {
      flipped = !flipped; seenBack = true; Audio.play('paper'); UI.hint(null);
      flip.classList.toggle('flipped', flipped);
      bFlip.textContent = flipped ? C.flipBack : C.flip;
      if (last) { bKeep.hidden = false; if (!S.filmSaid) { S.filmSaid = true; setTimeout(() => { if (ctx.alive && flipped) UI.caption(C.filmFound); }, 700); } }
      note.hidden = true;
    };
    ctx.on(bFlip, 'click', doFlip);
    let sx0 = null;
    ctx.on(card, 'pointerdown', (e) => { sx0 = e.clientX; });
    ctx.on(card, 'pointerup', (e) => { if (sx0 != null && Math.abs(e.clientX - sx0) > 46) doFlip(); sx0 = null; });
    ctx.on(hot, 'click', (e) => {
      e.stopPropagation(); Audio.play('pop'); UI.hint(null);
      note.querySelector('b').textContent = ph.hotspot.label; note.querySelector('p').textContent = ph.hotspot.text;
      note.hidden = false; note.classList.remove('in'); void note.offsetWidth; note.classList.add('in');
      hot.classList.add('seen');
    });
    ctx.on(note.querySelector('button'), 'click', () => { note.hidden = true; Audio.play('tap'); });
    await ctx.tap(bKeep);
    Audio.play('tap'); UI.clear(); Audio.duck(false);
    note.hidden = true;
    el.querySelector('.a2-btns').style.display = 'none';
    if (last) { S.lastCard = { el, card, flip }; el.classList.add('closing'); return; }
    // 收到桌面的照片堆里
    const px = 18 + i * 66, py = S.gy + 64, rot = [-8, 6][i] || 0;
    el.classList.add('closing');
    if (flipped) flip.classList.remove('flipped');
    await ctx.anim(card, [{ transform: 'none' }, { transform: `translate(${px + 39 - 195}px,${py + 48 - (top + 200)}px) scale(.26) rotate(${rot}deg)` }], { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)' });
    this.keepSmall(ctx, ph, i);
    Audio.play('paper');
    el.remove();
  },

  // 最后一张照片背后的胶卷：小猫把它拉到桌边
  async filmOut(ctx) {
    const S = ctx.s, cat = ctx.cat, { el, card } = S.lastCard, H = ctx.H;
    const top = parseFloat(card.style.top);
    const tx = 150, ty = S.gy + 58;
    await ctx.anim(card, [{ transform: 'none' }, { transform: `translate(${tx + 40 - 195}px,${ty + 50 - (top + 200)}px) scale(.3) rotate(-5deg)` }], { duration: 600, easing: 'cubic-bezier(.5,0,.3,1)' });
    const back = h(`<div class="a2-backcard" style="left:${tx}px;top:${ty}px"></div>`);
    const can = h(`<div class="a2-can" style="left:${tx + 62}px;top:${ty + 24}px"></div>`);
    const strip = h(`<div class="a2-strip" style="left:${tx + 100}px;top:${ty + 34}px;width:0"></div>`);
    S.world.append(back, strip, can);
    el.remove();
    Audio.play('paper');
    await ctx.g(cat.play('stand'));
    cat.el.style.zIndex = 14;
    await ctx.g(cat.jumpTo(tx + 168, S.gy + 96, { h: 46, ms: 480 }));   // 从相机上跳下来
    await ctx.g(cat.face(-1));
    await ctx.g(cat.play('curious'));
    await ctx.g(cat.reach(tx + 108, ty + 44, { ms: 380 }));
    await ctx.g(cat.pat(2, 5));
    Audio.play('slide');
    // 爪子勾住胶卷头，往桌边拉
    let pulling = true;
    const follow = () => { if (!pulling || !ctx.alive) return; const pw = cat.joint('pawFN'); strip.style.width = Math.max(0, pw[0] - (tx + 100) + 6) + 'px'; requestAnimationFrame(follow); };
    follow();
    const endX = 306;
    cat.reachMove(endX - 40, ty + 46);
    const walk = cat.walkTo(endX, { speed: 70, keepFacing: true });
    const mv = () => { if (!pulling || !ctx.alive) return; const [hx] = [cat.x - 62]; cat.reachMove(hx, ty + 46); requestAnimationFrame(mv); };
    mv();
    await ctx.g(walk);
    pulling = false;
    strip.style.width = (cat.joint('pawFN')[0] - (tx + 100) + 6) + 'px';
    await ctx.g(cat.unreach(300));
    await ctx.g(cat.poseTo('lookBack', 340, 'out'));
    cat.lookAt(195, H - 80);
    // 用户拉开胶卷
    let goRes; const go = new Promise((r) => { goRes = r; });
    let sx = 0, moved = 0;
    ctx.drag(strip, { start: (p) => { sx = p[0]; }, move: (p) => { moved = Math.abs(p[0] - sx); strip.style.transform = `translateX(${clamp(p[0] - sx, -40, 40) * 0.5}px)`; if (moved > 36) goRes(); }, end: () => { strip.style.transform = ''; } });
    ctx.on(strip, 'click', () => goRes());
    strip.classList.add('ready');
    UI.hint(C.hintFilm, C.altFilm, () => goRes());
    await ctx.g(go);
    UI.clear(); Audio.play('slide');
    // 镜头推近胶卷
    const cxp = tx + 150, cyp = ty + 46;
    S.world.style.transformOrigin = `${cxp}px ${cyp}px`;
    await ctx.anim(S.world, [{ transform: 'none' }, { transform: 'scale(7)' }], { duration: 800, easing: 'cubic-bezier(.6,0,.9,.6)' });
    return { type: 'veil', color: '#16110c', ms: 200 };
  },
};
