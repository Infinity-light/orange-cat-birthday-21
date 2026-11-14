// 第六幕：刮开写给你的话
import { CONTENT } from '../content.js';
import { UI, h, esc, nl2br, clamp, lerp, rng, plate, motes } from '../core.js';
import { Audio } from '../audio.js';

const C = CONTENT.act6;

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root;
    const big = H >= 760;
    const fy = H - 84;                                 // 地板上小猫站的位置
    const cardH = clamp(fy - 122, 384, 560), cardTop = Math.max(58, fy - 58 - cardH);
    const S = ctx.s = { cardH, cardTop, fy };
    root.innerHTML = `
      <div class="world" style="width:780px">
        ${plate('a6-hall', '#161d14', 'wide')}
        ${motes(12, [0, H - 720, 300, 480], 11)}
        <div class="plate wide a6-openplate" style="background-image:url(assets/scene/a6-hall-open.webp)"></div>
        ${CONTENT.act2.photos.map((p, i) => `<div class="polaroid a6-wallph" style="left:${402 + i * 40}px;top:${H - 372 + [0, 50, 10][i]}px;transform:rotate(${[-5, 4, 7][i]}deg)"><img src="${esc(p.src)}" alt=""></div>`).join('')}
        <div class="a6-tagtext" style="left:427px;top:${H - 452}px">生日房间</div>
        <div class="a6-doorwrap" style="left:517px;top:${H - 508}px"><div class="a6-glow"></div></div>
        <div class="a6-card ${big ? 'big' : ''}" style="top:${cardTop}px;height:${cardH}px">
          <div class="a6-flip">
            <div class="face front">
              <h3>${esc(C.cardTitle)}</h3>
              <div class="a6-letter">${C.letter.map((p) => `<p>${esc(p)}</p>`).join('')}<canvas class="a6-coat"></canvas></div>
            </div>
            <div class="face back">
              <div class="a6-inv">
                <span class="a6-stamp">21</span>
                <h3>${esc(C.invite.title)}</h3>
                ${C.invite.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
                <em>${esc(C.invite.sign)}</em>
              </div>
            </div>
          </div>
        </div>
        <div class="a6-notes" hidden style="top:${Math.max(cardTop + 30, 116)}px"></div>
      </div>`;
    const q = (s) => root.querySelector(s);
    S.world = q('.world'); S.card = q('.a6-card'); S.flip = q('.a6-flip'); S.coat = q('.a6-coat'); S.notes = q('.a6-notes'); S.letter = q('.a6-letter');
    S.doorwrap = q('.a6-doorwrap'); S.openplate = q('.a6-openplate');
    const cat = ctx.cat;
    cat.scale = 1.2; cat.mount(S.world); cat.el.style.zIndex = 16; cat.rig.showShadow(true); cat.setPose('sit');
    cat.rig.tone = { dir: [-1, -1], hi: 'rgba(255,205,135,.20)', lo: 'rgba(30,14,5,.42)', shadow: 12 };
    cat.place(326, fy + 14, { facing: -1 });
  },

  paintCoat(ctx) {
    const S = ctx.s, cv = S.coat, w = S.letter.clientWidth, hh = S.letter.clientHeight;
    cv.width = w * 2; cv.height = hh * 2; cv.style.width = w + 'px'; cv.style.height = hh + 'px';
    const g = cv.getContext('2d'); g.scale(2, 2);
    const gr = g.createLinearGradient(0, 0, w, hh);
    [[0, '#b99a5a'], [0.18, '#e9d9a6'], [0.32, '#c6a868'], [0.5, '#f3e7bd'], [0.64, '#b8975a'], [0.82, '#e2cf98'], [1, '#a98a4e']].forEach(([t, c]) => gr.addColorStop(t, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    const r = rng(5);
    // 拉丝：很多条极淡的横线
    for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,250,230' : '90,62,26'},${0.03 + r() * 0.08})`; g.fillRect(r() * w - 20, r() * hh, 30 + r() * 120, 0.6 + r() * 0.8); }
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '110,78,36'},${0.05 + r() * 0.12})`; g.fillRect(r() * w, r() * hh, 1 + r() * 1.6, 1 + r() * 1.6); }
    g.strokeStyle = 'rgba(96,62,24,.22)'; g.lineWidth = 1;
    for (let y = 26; y < hh; y += 44) for (let x = (y / 44 % 2) * 22 + 14; x < w; x += 44) { g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 0.8; g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } g.closePath(); g.stroke(); }
    g.fillStyle = 'rgba(106,59,31,.75)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '22px Wenkai, "Kaiti SC", STKaiti, KaiTi, serif'; g.fillText(C.coatText, w / 2, hh / 2);
    g.font = '13px Wenkai, "Kaiti SC", STKaiti, KaiTi, serif'; g.fillStyle = 'rgba(106,59,31,.55)'; g.fillText('↙ 用手指来回划', w / 2, hh / 2 + 30);
    S.cw = w; S.ch = hh;
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat, self = this, H = ctx.H, root = ctx.root;
    // 等字体就绪再画涂层（最多等 1.2 秒），之后不再重画，避免把已经刮开的地方盖回去
    if (document.fonts && document.fonts.load) { try { await ctx.g(Promise.race([document.fonts.load('22px Wenkai', '刮开这里'), new Promise((r) => setTimeout(r, 1200))])); } catch (e) { if (e && e.isAbort) throw e; } }
    // 字号自适应：保证整段话在卡片里完整放得下，右下角给小猫留出位置（不滚动、不截断）
    { const L = S.letter; let fs = ctx.H >= 760 ? 17.5 : 16; L.style.paddingBottom = '30px';
      for (; fs >= 12.5; fs -= 0.5) { L.style.fontSize = fs + 'px'; L.style.lineHeight = (fs >= 16 ? 1.82 : 1.68); if (L.scrollHeight <= L.clientHeight + 1) break; } }
    self.paintCoat(ctx);
    // 卡片落下，小猫用爪子压住一角
    await ctx.anim(S.card, [{ transform: 'translateY(-60px) scale(1.12)' }, { transform: 'none' }], { duration: 600 });
    const corner = [262, S.cardTop + S.cardH - 6];
    cat.extra = { headX: -10, headY: -6, tilt: -8 };   // 头往后让一让，露出压着卡片的爪子
    await ctx.g(cat.poseTo('stand', 240));
    await ctx.g(cat.reach(corner[0] + 14, corner[1], { ms: 420 }));
    Audio.play('tap');
    cat.lookAt(195, S.cardTop + S.cardH / 2);

    // ---- 刮 ----
    const cv = S.coat, g = cv.getContext('2d');
    let lastP = null, cleared = false, moves = 0;
    let doneRes; const scratched = new Promise((r) => { doneRes = r; });
    const local = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S.cw, (e.clientY - r.top) / r.height * S.ch]; };
    const wipe = (a, b) => { g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 44; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + 0.01, b[1]); g.stroke(); };
    const check = () => {
      const d = g.getImageData(0, 0, cv.width, cv.height).data; let c = 0, n = 0;
      for (let i = 3; i < d.length; i += 4 * 211) { n++; if (d[i] < 40) c++; }
      if (c / n > 0.45) finish();
    };
    const finish = () => {
      if (cleared) return; cleared = true; S.scratched = true; UI.hint(null);
      // 剩余涂层自然散开
      const rr = rng(9), box = S.letter.getBoundingClientRect(), sc = box.width / S.cw;
      for (let i = 0; i < 26; i++) {
        const fl = h('<i class="a6-flake"></i>'); const x = rr() * S.cw, y = rr() * S.ch;
        Object.assign(fl.style, { left: x + 'px', top: y + 'px', width: 6 + rr() * 12 + 'px', height: 4 + rr() * 8 + 'px' });
        S.letter.appendChild(fl);
        fl.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${(rr() - 0.5) * 160}px,${40 + rr() * 120}px) rotate(${rr() * 360}deg)`, opacity: 0 }], { duration: 900 + rr() * 600, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).finished.then(() => fl.remove()).catch(() => {});
      }
      cv.style.transition = 'opacity .9s'; cv.style.opacity = 0; cv.style.pointerEvents = 'none';
      Audio.play('chime'); setTimeout(doneRes, 900);
    };
    ctx.on(cv, 'pointerdown', (e) => { if (cleared) return; lastP = local(e); wipe(lastP, lastP); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* */ } UI.hint(null); e.preventDefault(); });
    ctx.on(cv, 'pointermove', (e) => { if (!lastP || cleared) return; const p = local(e); wipe(lastP, p); lastP = p; if (++moves % 3 === 0) Audio.play('scratch'); if (moves % 8 === 0) check(); });
    const up = () => { if (!lastP) return; lastP = null; check(); if (!cleared) UI.hint(C.hintScratch, C.altScratch, finish); };
    ctx.on(cv, 'pointerup', up); ctx.on(cv, 'pointercancel', up);
    UI.hint(C.hintScratch, C.altScratch, finish);
    await ctx.g(scratched);
    Audio.duck(true);
    cat.extra = {}; cat.unreach(400); cat.play('sit');
    await ctx.wait(1200);
    await UI.cta(ctx, CONTENT.ui.continue);

    // ---- 朋友留言：像便签一样逐张打开 ----
    UI.caption(C.notesIntro);
    S.notes.hidden = false;
    const colors = ['#ffe9a8', '#f9d5c2', '#d9ead3', '#fbf3e2'];
    for (let i = 0; i < C.notes.length; i++) {
      const n = C.notes[i];
      const el = h(`<div class="a6-note" style="background:${colors[i % 4]};--r:${[-2.5, 1.8, -1.2, 2.2][i % 4]}deg;--x:${[-8, 10, -4, 6][i % 4]}px;--y:${i * 14}px"><p>${nl2br(n.text)}</p><em>—— ${esc(n.from)}</em></div>`);
      S.notes.appendChild(el);
      Audio.play('paper');
      cat.lookAt(195, S.cardTop + 150);
      if (i === 0) await ctx.wait(500);
      await UI.cta(ctx, i < C.notes.length - 1 ? C.notesOpen : C.flip);
      if (i === 0) UI.caption(null);
    }
    // ---- 翻到背面：生日邀请 ----
    [...S.notes.children].forEach((el, i) => el.animate([{ transform: getComputedStyle(el).transform }, { transform: `translate(${i % 2 ? 420 : -420}px, ${40 * i}px) rotate(${i % 2 ? 30 : -30}deg)` }], { duration: 500, delay: i * 70, fill: 'forwards', easing: 'ease-in' }));
    await ctx.wait(650);
    S.notes.hidden = true;
    Audio.play('paper');
    S.flip.classList.add('flipped');
    await ctx.wait(900);
    Audio.play('chime');
    await ctx.wait(600);
    await UI.cta(ctx, '收下邀请');
    Audio.duck(false);
    // 小猫叼着邀请，向透着暖光的门走去
    await ctx.g(cat.poseTo('stand', 260));
    const mouth = () => { const hp = cat.joint('head'); return [hp[0] + 22 * cat.facing * cat.scale, hp[1] + 30 * cat.scale]; };
    const m0 = mouth();
    const cr = { x: 195, y: S.cardTop + S.cardH / 2 };
    await ctx.anim(S.card, [{ transform: 'none' }, { transform: `translate(${m0[0] - cr.x}px,${m0[1] - cr.y}px) scale(.105) rotate(-10deg)` }], { duration: 600, easing: 'cubic-bezier(.5,0,.3,1)' });
    S.card.style.zIndex = 17;
    let carry = true;
    const carryLoop = () => { if (!carry || !ctx.alive) return; const m = mouth(); S.card.getAnimations().forEach((a) => a.cancel()); S.card.style.transform = `translate(${m[0] - cr.x}px,${m[1] - cr.y}px) scale(.105) rotate(-10deg)`; requestAnimationFrame(carryLoop); };
    carryLoop();
    UI.caption(C.doorHint);
    cat.rig.tone = { dir: [1, -0.2], hi: 'rgba(255,196,110,.30)', lo: 'rgba(24,12,5,.48)', shadow: 22 };   // 走向门：光从门那边来
    const doorX = 603;
    const walk = cat.walkTo(doorX - 104, { speed: 130 });
    let camOn = true;
    const cam = () => { if (!camOn || !ctx.alive) return; const cx = clamp(cat.x - 150, 0, 390); S.world.style.transform = `translate3d(${-cx}px,0,0)`; S.camX = cx; requestAnimationFrame(cam); };
    cam();
    await ctx.g(walk);
    await ctx.g(cat.poseTo('lookBack', 340, 'out'));
    S.doorwrap.classList.add('ready');
    let dRes; const dTap = new Promise((r) => { dRes = r; });
    ctx.on(S.doorwrap, 'click', () => dRes());
    UI.hint(C.doorHint.slice(0, 0) + '门缝里透着暖光', C.doorTap, () => dRes());
    await ctx.g(dTap);
    UI.clear(); Audio.play('door');
    S.doorwrap.classList.remove('ready'); S.doorwrap.classList.add('open'); S.openplate.classList.add('on');
    await ctx.g(cat.poseTo('stand', 240));
    await ctx.wait(650);
    cat.walkTo(doorX - 10, { speed: 100 });
    await ctx.wait(500);
    camOn = false; carry = true;
    const dx = doorX, dy = H - 330;
    S.world.style.transformOrigin = `${dx}px ${dy}px`;
    await ctx.anim(S.world, [{ transform: `translate3d(${-S.camX}px,0,0) scale(1)` }, { transform: `translate3d(${195 - dx}px,${H / 2 - dy}px,0) scale(8)` }], { duration: 1200, easing: 'cubic-bezier(.6,0,.85,.5)' });
    carry = false;
    return { type: 'veil', color: '#ffe2a0', ms: 200 };
  },
};
