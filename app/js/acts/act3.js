// 第三幕：把这一年的日子拉出来（横向胶卷）
import { CONTENT } from '../content.js';
import { UI, h, esc, nl2br, clamp, lerp, Store, Stage } from '../core.js';
import { Audio } from '../audio.js';

const C = CONTENT.act3;
const ICONS = {
  knife: '<svg viewBox="0 0 64 64"><g transform="rotate(-35 32 32)"><rect x="6" y="26" width="34" height="12" rx="4" fill="#f2b33d" stroke="#6a3b1f" stroke-width="2"/><rect x="14" y="29" width="14" height="6" rx="2" fill="#6a3b1f"/><path d="M40 28h14l8 10H40z" fill="#dfe5e8" stroke="#6a3b1f" stroke-width="2" stroke-linejoin="round"/></g></svg>',
  tea: '<svg viewBox="0 0 64 64"><path d="M18 20h28l-4 36H22z" fill="#f8e27a" stroke="#6a3b1f" stroke-width="2" stroke-linejoin="round"/><circle cx="30" cy="38" r="7" fill="#fff6c9" stroke="#e9c33f" stroke-width="2"/><path d="M38 20l8-14" stroke="#d2553d" stroke-width="4" stroke-linecap="round"/><ellipse cx="32" cy="20" rx="14" ry="3" fill="#fff" stroke="#6a3b1f" stroke-width="2"/></svg>',
  shoe: '<svg viewBox="0 0 64 64"><path d="M8 40c0-10 4-16 10-16l8 8c6 4 14 4 22 8 6 3 8 6 8 10H8z" fill="#f29a3f" stroke="#6a3b1f" stroke-width="2" stroke-linejoin="round"/><path d="M8 46h48v5H8z" fill="#fbf3e2" stroke="#6a3b1f" stroke-width="2" stroke-linejoin="round"/><path d="M24 30l6-4M29 34l6-4" stroke="#fbf3e2" stroke-width="2.500" stroke-linecap="round"/></svg>',
};

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root, n = C.nodes.length;
    const small = H < 700;
    const f = Math.round(small ? clamp(H * 0.265, 160, 186) : clamp(H * 0.3, 184, 244));   // 画格边长
    const filmH = f + 48, filmTop = small ? 124 : Math.round(clamp(H * 0.185, 136, 156));
    const pitch = f + 46, lead = 250;
    const S = ctx.s = { f, filmH, filmTop, pitch, lead, n, scroll: 0, reached: -1, shown: -1, done: [], busy: false };
    S.sx = (i) => lead + i * pitch;                           // 第 i 个节点居中时的滚动量
    S.endX = S.sx(n - 1) + f / 2 + 150;
    const total = 195 + S.endX + 195 + 60;
    const frames = C.nodes.map((nd, i) => `
      <div class="a3-frame" data-i="${i}" style="left:${195 + S.sx(i) - f / 2}px;top:24px;width:${f}px;height:${f}px">
        <img src="${esc(nd.src)}" alt="" draggable="false">
        <span class="a3-no">▷ ${i + 1}A　${esc(nd.date)}</span>
      </div>`).join('');
    const panelTop = filmTop + filmH + 16;
    const plateTop = Math.round(filmTop + filmH / 2 - 326);       // 让底图里灯箱玻璃的中线对上胶卷的中线
    const endPx = 195 + S.endX - 4;
    const jag = [[0, 0], [10, 8], [2, 20], [14, 32], [4, 45], [12, 58], [0, 70], [9, 84], [0, 100]].map(([x, y]) => `${endPx + x}px ${y}%`).join(', ');
    root.innerHTML = `
      <div class="plate top" style="top:${plateTop}px;background-image:url(assets/scene/a3-plate2.webp)"></div>
      <div class="a3-film" style="top:${filmTop}px;height:${filmH}px;width:${total}px;clip-path:polygon(-400px 0, ${jag}, -400px 100%);-webkit-clip-path:polygon(-400px 0, ${jag}, -400px 100%)">
        <div class="a3-leader" style="left:60px;top:${filmH / 2 - 40}px">${esc(CONTENT.person.year)} · ${esc(CONTENT.person.nick)}的这一年<small>→ 往左拉</small></div>
        ${frames}
      </div>
      <div class="a3-catlayer"></div>
      <div class="a3-panel" style="top:${panelTop}px;height:${H - panelTop - 76}px"><div class="a3-paper" hidden></div><i class="a3-cue" hidden>▾ 往下还有</i></div>
      <div class="a3-nav" style="top:${filmTop + filmH / 2 - 22}px"><button type="button" data-d="-1" aria-label="${esc(C.altPrev)}" hidden>‹</button><button type="button" data-d="1" aria-label="${esc(C.altNext)}">›</button></div>`;
    S.cue = root.querySelector('.a3-cue');
    S.film = root.querySelector('.a3-film'); S.paper = root.querySelector('.a3-paper'); S.panel = root.querySelector('.a3-panel');
    S.nav = root.querySelector('.a3-nav');
    const cat = ctx.cat;
    cat.scale = H < 700 ? 0.82 : 0.96;
    cat.mount(root.querySelector('.a3-catlayer')); cat.rig.showShadow(false);
    cat.rig.tone = { dir: [0.2, 1], hi: 'rgba(255,232,190,.30)', lo: 'rgba(16,8,3,.46)', ground: 'rgba(0,0,0,0)', shadow: 0 };   // 灯箱的光从脚下往上打
    cat.setPose('stand'); cat.place(78, filmTop + 7, { facing: 1 });
    // 恢复进度
    const saved = Store.data.sub.a3;
    if (typeof saved === 'number' && saved >= 0 && ctx.opts.jumped) {
      S.reached = Math.min(saved, n - 1);
      for (let i = 0; i < S.reached; i++) S.done[i] = true;
      S.scroll = S.sx(S.reached);
    }
    this.apply(ctx);
  },
  apply(ctx) {
    const S = ctx.s;
    S.film.style.transform = `translate3d(${-S.scroll}px,0,0)`;
  },
  maxScroll(S) {
    if (S.reached < 0) return S.sx(0);
    if (!S.done[S.reached]) return S.sx(S.reached);
    return S.reached < S.n - 1 ? S.sx(S.reached + 1) : S.endX;
  },
  targets(S) {
    const t = [];
    for (let i = 0; i <= S.reached; i++) t.push(S.sx(i));
    const m = this.maxScroll(S); if (!t.includes(m)) t.push(m);
    if (S.reached < 0) t.unshift(0);
    return t;
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat, self = this, root = ctx.root;
    let endRes; const ended = new Promise((r) => { endRes = r; });
    let tweenId = 0;
    const setScroll = (v, fromUser) => {
      const prev = S.scroll;
      S.scroll = v; self.apply(ctx);
      const d = v - prev;
      if (Math.abs(d) > 0.2) {
        cat.gaitDrive(Math.abs(d) * 0.8);
        const dir = d > 0 ? 1 : -1;
        if (dir !== cat.facing && Math.abs(d) > 1.5) cat.face(dir);
        if (fromUser && Math.random() < 0.08) Audio.play('tick');
      }
    };
    const tweenTo = (target, ms = 420) => new Promise((res) => {
      const id = ++tweenId, from = S.scroll, t0 = performance.now();
      const step = () => {
        if (id !== tweenId || !ctx.alive) return res(false);
        const u = clamp((performance.now() - t0) / ms, 0, 1), k = 1 - Math.pow(1 - u, 3);
        setScroll(lerp(from, target, k));
        if (u < 1) requestAnimationFrame(step); else res(true);
      };
      step();
    });
    // 胶卷两侧的小箭头：拖动的按钮替代（上一格 / 下一格）
    const navUpdate = () => {
      const t = self.targets(S).sort((a, b) => a - b); const [bp, bn] = S.nav.children;
      const cur = t.reduce((b, v) => (Math.abs(v - S.scroll) < Math.abs(b - S.scroll) ? v : b), t[0]); const idx = t.indexOf(cur);
      bp.hidden = idx <= 0 || S.busy; bn.hidden = idx >= t.length - 1 || S.busy;
    };
    S.navUpdate = navUpdate;
    const arrive = async (target) => {
      const ok = await tweenTo(target, clamp(Math.abs(target - S.scroll) * 2.2, 260, 900));
      if (!ok) return;
      navUpdate();
      if (target === S.endX && S.done[S.n - 1]) { endRes(); return; }
      const k = Math.round((target - S.lead) / S.pitch);
      if (k >= 0 && k < S.n && Math.abs(S.sx(k) - target) < 1) self.showNode(ctx, k);
      else if (target === 0) { self.hidePaper(ctx); }
    };
    S.go = (dir) => {
      if (S.busy) return;
      const t = self.targets(S).sort((a, b) => a - b);
      let cur = t.reduce((b, v) => (Math.abs(v - S.scroll) < Math.abs(b - S.scroll) ? v : b), t[0]);
      let idx = t.indexOf(cur) + dir;
      if (idx < 0 || idx >= t.length) { // 到头了：轻轻晃一下
        S.film.animate([{ transform: `translate3d(${-S.scroll}px,0,0)` }, { transform: `translate3d(${-S.scroll - dir * 14}px,0,0)` }, { transform: `translate3d(${-S.scroll}px,0,0)` }], { duration: 300 });
        if (dir > 0 && S.reached >= 0 && !S.done[S.reached]) self.nudge(ctx);
        return;
      }
      Audio.play('slide'); cat.poseTo('stand', 180);
      arrive(t[idx]);
    };
    ctx.on(S.nav, 'click', (e) => { const b = e.target.closest('button'); if (b) { Audio.play('tap'); S.go(+b.dataset.d); } });

    // 拖动胶卷
    let x0 = 0, s0 = 0, moved = 0, dragging = false;
    ctx.drag(root, {
      start: (p, e) => {
        if (S.busy || e.target.closest('button, .a3-paper, .a3-fog, .a3-ticket')) return false;
        tweenId++; x0 = p[0]; s0 = S.scroll; moved = 0; dragging = true; UI.hint(null);
        cat.poseTo('stand', 180);
      },
      move: (p) => {
        if (!dragging) return;
        const dx = p[0] - x0; moved = dx;
        let v = s0 - dx; const max = self.maxScroll(S);
        if (v > max) v = max + (v - max) * 0.22;
        if (v < 0) v = v * 0.22;
        setScroll(v, true);
        if (S.shown >= 0 && Math.abs(v - S.sx(S.shown)) > 70) self.hidePaper(ctx);
      },
      end: () => {
        if (!dragging) return; dragging = false;
        const t = self.targets(S);
        let best = t.reduce((b, v) => (Math.abs(v - S.scroll) < Math.abs(b - S.scroll) ? v : b), t[0]);
        // 朝拖动方向多走一格
        if (Math.abs(moved) > 46) {
          const dir = moved < 0 ? 1 : -1, sorted = t.slice().sort((a, b) => a - b);
          const from = sorted.reduce((b, v) => (Math.abs(v - s0) < Math.abs(b - s0) ? v : b), sorted[0]);
          const idx = clamp(sorted.indexOf(from) + dir, 0, sorted.length - 1);
          best = sorted[idx];
        }
        if (moved < -30 && S.reached >= 0 && !S.done[S.reached] && best === S.sx(S.reached)) self.nudge(ctx);
        arrive(best);
      },
    });

    if (S.reached >= 0) self.showNode(ctx, S.reached);
    else { await ctx.wait(700); UI.hint(C.hintDrag, C.altNext, () => S.go(1)); }
    await ctx.g(ended);

    // ---- 胶卷尽头：掉出一张车票 ----
    S.busy = true; UI.clear(); self.hidePaper(ctx); S.nav.style.display = 'none';
    const T = C.ticket, H = ctx.H;
    await ctx.g(cat.play('stand'));
    await ctx.g(cat.face(1));
    await ctx.g(cat.walkTo(196, { speed: 110 }));
    const endScreenX = 195 + S.endX - S.scroll;
    await ctx.g(cat.reach(endScreenX - 6, S.filmTop + 26, { ms: 380 })); await ctx.g(cat.pat(2, 6));
    const ty = S.filmTop + S.filmH + 34;
    const ticket = h(`<button type="button" class="a3-ticket" style="left:55px;top:${ty}px">
      <div class="tk-top"><span>${esc(T.no)}</span><span>${esc(T.date)}</span></div>
      <div class="tk-route"><b>${esc(T.from)}</b><svg viewBox="0 0 90 20" width="90" height="20"><path class="tk-line" d="M2 10H88" stroke="#d2553d" stroke-width="2.500" stroke-linecap="round" fill="none"/><path d="M78 3l10 7-10 7" stroke="#d2553d" stroke-width="2.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><b>${esc(T.to)}</b></div>
      <div class="tk-bottom"><span>${esc(T.seat)}</span><span>${esc(T.note)}</span></div>
      <svg class="tk-map" viewBox="0 0 280 150" preserveAspectRatio="none"><path class="tk-path" d="M24 118 C60 60 96 136 132 86 S 200 30 222 70 S 250 96 258 36" fill="none" stroke="#d2553d" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9"/><g class="tk-dots" fill="#fbf3e2" stroke="#6a3b1f" stroke-width="2"><circle cx="24" cy="118" r="6"/><circle cx="96" cy="103" r="6"/><circle cx="162" cy="56" r="6"/><circle cx="222" cy="70" r="6"/><circle cx="258" cy="36" r="7" fill="#f29a3f"/></g></svg>
    </button>`);
    root.appendChild(ticket);
    Audio.play('paper');
    cat.unreach(300); cat.lookAt(195, ty + 60);
    await ctx.anim(ticket, [{ transform: `translate(${endScreenX - 195}px,${-(ty - S.filmTop) + 30}px) rotate(-70deg) scale(.3)`, opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(0,14px) rotate(6deg)', offset: 0.8 }, { transform: 'rotate(-3deg)' }], { duration: 900, easing: 'cubic-bezier(.3,0,.4,1)' });
    Audio.play('pop');
    UI.hint(C.ticketHint, C.ticketTap, () => ticket.click());
    await ctx.tap(ticket);
    UI.clear(); Audio.play('paper'); Audio.duck(true);
    // 票面上的路线逐渐展开成地图
    ticket.classList.add('open');
    const cy = clamp(H / 2 - 110, 120, 400) - ty;
    await ctx.anim(ticket, [{ transform: 'rotate(-3deg)' }, { transform: `translate(0,${cy}px) scale(1.14) rotate(0deg)` }], { duration: 700 });
    await ctx.wait(1900);
    Audio.play('whoosh'); Audio.duck(false);
    await ctx.anim(ticket, [{ transform: `translate(0,${cy}px) scale(1.14)` }, { transform: `translate(0,${cy + 40}px) scale(5.5)` }], { duration: 800, easing: 'cubic-bezier(.6,0,.9,.5)' });
    Store.data.sub.a3 = -1; Store.save();
    return { type: 'veil', color: '#ecdfc2', ms: 220 };
  },

  nudge(ctx) { // 还有没完成的小互动：提示一下，不强拉
    const S = ctx.s, nd = C.nodes[S.reached];
    if (nd && nd.interact) { ctx.cat.play('curious'); const p = S.paper.querySelector('.a3-inter'); if (p) p.animate([{ transform: 'none' }, { transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 400 }); }
  },
  hidePaper(ctx) {
    const S = ctx.s; if (S.shown < 0) return;
    S.shown = -1; Audio.duck(false); S.cue.hidden = true;
    const p = S.paper; p.classList.add('fold'); setTimeout(() => { if (S.shown < 0) p.hidden = true; }, 240);
    const fog = ctx.root.querySelector('.a3-fog'); if (fog) fog.style.pointerEvents = 'none';
  },

  // 到达节点：照片停稳，文字展开；小猫坐下等
  showNode(ctx, k) {
    const S = ctx.s, cat = ctx.cat, nd = C.nodes[k], self = this;
    if (S.shown === k) return;
    S.shown = k;
    if (k > S.reached) { S.reached = k; Store.data.sub.a3 = k; Store.save(); }
    cat.play('sit'); cat.lookAt(195, S.filmTop + S.filmH / 2 + 40);
    Audio.play('reelStop'); Audio.duck(true);
    const it = nd.interact, done = !!S.done[k];
    const p = S.paper;
    p.innerHTML = `<div class="a3-head"><span class="a3-date">${esc(nd.date)}</span><b>${esc(nd.title)}</b></div>
      <p>${nl2br(nd.text)}</p>
      <div class="a3-inter"></div>
      <div class="a3-more" ${done || !it ? '' : 'hidden'}>${nd.noteText && done ? `<p class="a3-quote">${nl2br(nd.noteText)}</p>` : ''}${nd.more ? `<p>${nl2br(nd.more)}</p>` : ''}</div>`;
    p.hidden = false; p.classList.remove('fold', 'in'); void p.offsetWidth; p.classList.add('in'); p.scrollTop = 0;
    // 纸上的内容超出一屏时，给一个「往下还有」的提示
    const cue = () => { S.cue.hidden = !(S.shown === k && p.scrollHeight - p.scrollTop - p.clientHeight > 12); };
    p.onscroll = cue; setTimeout(cue, 600); S.cueFn = cue;
    const inter = p.querySelector('.a3-inter'), more = p.querySelector('.a3-more');
    const finish = (extraHtml) => {
      S.done[k] = true; S.navUpdate && S.navUpdate();
      if (extraHtml) more.insertAdjacentHTML('afterbegin', extraHtml);
      more.hidden = false; more.classList.add('in'); Audio.play('chime'); setTimeout(() => S.cueFn && S.cueFn(), 1200);
      cat.play('happy').then(() => { if (S.shown === k) cat.play('sit'); });
      inter.classList.add('done');
      setTimeout(() => { if (ctx.alive && S.shown === k) { p.scrollTo({ top: p.scrollHeight, behavior: 'smooth' }); UI.hint(k < S.n - 1 ? C.more : C.more, C.altNext, () => S.go(1)); } }, 500);
    };
    if (!it) { S.done[k] = true; S.navUpdate && S.navUpdate(); UI.hint(C.more, C.altNext, () => S.go(1)); return; }
    if (done) { UI.hint(C.more, C.altNext, () => S.go(1)); return; }
    if (it.type === 'fog') self.fog(ctx, k, it, finish);
    else if (it.type === 'find') {
      inter.innerHTML = `<p class="a3-q">${esc(it.hint)}</p><div class="a3-items">${it.items.map((x, i) => `<button type="button" data-i="${i}">${ICONS[x.id] || ''}<span>${esc(x.label)}</span></button>`).join('')}</div><p class="a3-say" hidden></p>`;
      UI.hint(null);
      const say = inter.querySelector('.a3-say');
      inter.querySelector('.a3-items').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b || S.done[k]) return;
        const x = it.items[+b.dataset.i];
        say.hidden = false; say.textContent = x.say;
        if (x.right) { b.classList.add('right'); Audio.play('ding'); finish(); }
        else { b.classList.add('tried'); Audio.play('tap'); cat.play('shake').then(() => { if (S.shown === k) cat.play('sit'); }); p.scrollTo({ top: p.scrollHeight, behavior: 'smooth' }); }
      });
    } else if (it.type === 'note') {
      inter.innerHTML = `<button type="button" class="a3-folded"><i></i><span>${esc(it.label)}</span></button>`;
      const open = () => {
        if (S.done[k]) return;
        Audio.play('paper');
        inter.innerHTML = `<div class="a3-unfold"><p class="a3-quote">${nl2br(nd.noteText)}</p></div>`;
        finish();
      };
      inter.querySelector('button').addEventListener('click', open);
      UI.hint(it.hint, it.alt, open);
    }
  },

  // 擦掉照片上的雾
  fog(ctx, k, it, finish) {
    const S = ctx.s, frame = S.film.querySelector(`.a3-frame[data-i="${k}"]`);
    let cv = frame.querySelector('.a3-fog');
    if (!cv) {
      cv = document.createElement('canvas'); cv.className = 'a3-fog'; cv.width = cv.height = 240; frame.appendChild(cv);
      const g = cv.getContext('2d');
      g.fillStyle = '#dfe7ea'; g.fillRect(0, 0, 240, 240);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`; g.beginPath(); g.arc(Math.random() * 240, Math.random() * 240, 14 + Math.random() * 40, 0, 7); g.fill(); }
      for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(170,190,200,.5)'; g.beginPath(); const x = Math.random() * 240, y = Math.random() * 240; g.ellipse(x, y, 2.5, 5 + Math.random() * 8, 0, 0, 7); g.fill(); }
    }
    cv.style.pointerEvents = 'auto';
    const g = cv.getContext('2d');
    let lastP = null, cleared = false, moves = 0;
    const local = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 240, (e.clientY - r.top) / r.height * 240]; };
    const wipe = (a, b) => {
      g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineWidth = 46; g.strokeStyle = '#000';
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    };
    const check = () => {
      const d = g.getImageData(0, 0, 240, 240).data; let c = 0, n = 0;
      for (let i = 3; i < d.length; i += 4 * 97) { n++; if (d[i] < 40) c++; }
      if (c / n > 0.5) done();
    };
    const done = () => {
      if (cleared) return; cleared = true; cv.style.transition = 'opacity .8s'; cv.style.opacity = 0; cv.style.pointerEvents = 'none';
      setTimeout(() => cv.remove(), 900); UI.hint(null); finish();
    };
    const down = (e) => { if (cleared) return; e.stopPropagation(); lastP = local(e); wipe(lastP, lastP); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* */ } UI.hint(null); };
    const move = (e) => { if (!lastP || cleared) return; const p = local(e); wipe(lastP, p); lastP = p; if (++moves % 4 === 0) Audio.play('scratch', 0.7); if (moves % 6 === 0) check(); };
    const up = () => { if (!lastP) return; lastP = null; check(); if (!cleared) UI.hint(it.hint, it.alt, done); };
    ctx.on(cv, 'pointerdown', down); ctx.on(cv, 'pointermove', move); ctx.on(cv, 'pointerup', up); ctx.on(cv, 'pointercancel', up);
    UI.hint(it.hint, it.alt, done);
  },
};
