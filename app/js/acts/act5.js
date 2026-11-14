// 第五幕：生日好运小卖部（货架 + 老虎机）
import { CONTENT } from '../content.js';
import { UI, h, esc, clamp, lerp, Store, plate, motes } from '../core.js';
import { Audio } from '../audio.js';

const C = CONTENT.act5;
const L = '#6a3b1f';
export const ITEM_ICONS = {
  tea: `<svg viewBox="0 0 60 70"><path d="M14 22h32l-4 44H18z" fill="#f8e27a" stroke="${L}" stroke-width="2" stroke-linejoin="round"/><path d="M15 34h30l-1 12H16z" fill="#fbf3e2" stroke="${L}" stroke-width="1.500"/><circle cx="30" cy="40" r="4.500" fill="#f2c94d" stroke="${L}" stroke-width="1.200"/><ellipse cx="30" cy="22" rx="16" ry="3.500" fill="#fff" stroke="${L}" stroke-width="2"/><path d="M36 22l8-18" stroke="#d2553d" stroke-width="4" stroke-linecap="round"/></svg>`,
  film: `<svg viewBox="0 0 60 70"><rect x="12" y="20" width="32" height="44" rx="5" fill="#3a6254" stroke="${L}" stroke-width="2"/><rect x="12" y="32" width="32" height="16" fill="#f2c94d" stroke="${L}" stroke-width="1.500"/><rect x="20" y="12" width="16" height="9" rx="2" fill="#2a1a10"/><path d="M44 30h8v26h-8" fill="#2a1a10"/><text x="28" y="45" font-size="11" text-anchor="middle" fill="${L}">36</text></svg>`,
  plaster: `<svg viewBox="0 0 60 70"><rect x="8" y="26" width="44" height="36" rx="4" fill="#fbf3e2" stroke="${L}" stroke-width="2"/><rect x="8" y="26" width="44" height="10" fill="#d2553d" stroke="${L}" stroke-width="1.500"/><g transform="rotate(-18 30 50)"><rect x="14" y="45" width="32" height="10" rx="5" fill="#f3c99b" stroke="${L}" stroke-width="1.500"/><rect x="25" y="45" width="10" height="10" fill="#fff3df" stroke="${L}" stroke-width="1"/></g></svg>`,
  candy: `<svg viewBox="0 0 60 70"><path d="M16 28h28v32a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="#e8f3f1" stroke="${L}" stroke-width="2"/><rect x="14" y="20" width="32" height="9" rx="3" fill="#d2553d" stroke="${L}" stroke-width="2"/><g stroke="${L}" stroke-width="1.200"><circle cx="24" cy="40" r="5" fill="#f29a3f"/><circle cx="35" cy="43" r="5" fill="#f2c94d"/><circle cx="27" cy="52" r="5" fill="#f29a3f"/><circle cx="37" cy="55" r="5" fill="#f6b56a"/><circle cx="23" cy="60" r="4" fill="#f2c94d"/></g></svg>`,
};

const SHELF_X = [60, 153, 236, 320];      // 货架上四样东西在底图里的中心 x
const REEL_H = 126;                        // 转轮窗口的高度（按底图量的）

export default {
  build(ctx) {
    const H = ctx.H, root = ctx.root;
    const gy = H - 150;                               // 地板线
    const mTop = H - 492;                             // 机器顶
    const S = ctx.s = { gy, mTop, idx: [0, 0, 0], seen: new Set(), spinning: false };
    const reel = (i) => `<div class="a5-win" style="left:${50 + i * 54}px"><div class="a5-reel" data-r="${i}">${[...C.reels[i], ...C.reels[i], ...C.reels[i]].map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>`;
    root.innerHTML = `
      <div class="world">
        ${plate('a5-plate', '#141d16')}
        ${motes(10, [0, H - 700, 240, 420], 8)}
        <div class="a5-bulbs" style="top:${H - 845}px">${[[28, 71], [77, 80], [122, 85], [169, 78], [215, 69], [270, 60], [319, 64], [369, 51]].map(([x, y], i) => `<i style="left:${x}px;top:${y}px;animation-delay:${-i * 0.47}s"></i>`).join('')}</div>
        <div class="a5-shelf" style="top:${H - 668}px">
          ${C.shelf.map((it, i) => `<button type="button" class="a5-item" data-i="${i}" aria-label="${esc(it.label)}" style="left:${SHELF_X[i] - 36}px"><span>${esc(it.label)}</span></button>`).join('')}
        </div>
        <div class="a5-cal" style="top:${H - 506}px"><i>${esc(CONTENT.person.year)} · 11</i><b>21</b><em>今天营业到很晚</em></div>
        <div class="a5-machine" style="top:${mTop}px">
          <div class="a5-marquee"><b>${esc(C.machineName)}</b></div>
          <i class="a5-yuan">${esc(C.wishPrefix)}</i>
          ${reel(0)}${reel(1)}${reel(2)}
          <div class="a5-plate">${esc(C.noLose)}</div>
          <div class="a5-lever"><i class="a5-stick"></i><i class="a5-ball"></i></div>
        </div>
        <div class="a5-card" hidden><span>生日好运</span><b>21</b><em>刮开有话</em></div>
        <div class="a5-tag" hidden><b></b><p></p><button type="button" class="btn small">知道了</button></div>
        <div class="a5-result" hidden style="top:${Math.min(H - 190, mTop + 352)}px"><p></p><div><button type="button" class="btn" data-a="again">${esc(C.again)}</button><button type="button" class="btn primary" data-a="take">${esc(C.take)}</button></div></div>
      </div>`;
    const q = (s) => root.querySelector(s);
    S.world = q('.world'); S.lever = q('.a5-lever'); S.card = q('.a5-card'); S.tag = q('.a5-tag'); S.result = q('.a5-result'); S.machine = q('.a5-machine');
    S.reels = [...root.querySelectorAll('.a5-reel')];
    const cat = ctx.cat;
    cat.scale = 1.25; cat.mount(S.world); cat.el.style.zIndex = 14; cat.rig.showShadow(true); cat.setPose('stand');
    cat.rig.tone = { dir: [-1, -1], hi: 'rgba(255,190,110,.26)', lo: 'rgba(30,12,4,.46)', shadow: 12 };   // 左上方吊灯的钨丝灯光
    cat.place(-90, gy + 70, { facing: 1 });
    S.reels.forEach((r, i) => this.setReel(ctx, i, C.reels[i].length + Math.floor(Math.random() * C.reels[i].length)));
  },
  setReel(ctx, i, pos) { // pos：以格为单位的位置（可小数）
    const n = C.reels[i].length, S = ctx.s;
    const p = ((pos % n) + n) % n + n;
    S.reels[i].style.transform = `translate3d(0,${-p * REEL_H}px,0)`;
    S.reels[i]._pos = p;
  },

  async run(ctx) {
    const S = ctx.s, cat = ctx.cat, self = this, root = ctx.root;
    await ctx.g(cat.walkTo(40, { speed: 170 }));
    cat.play('curious');
    // ---- 货架：点两三件东西 ----
    const showTag = (i) => {
      const it = C.shelf[i]; S.seen.add(i);
      S.tag.querySelector('b').textContent = it.label; S.tag.querySelector('p').textContent = it.text;
      S.tag.hidden = false; S.tag.classList.remove('in'); void S.tag.offsetWidth; S.tag.classList.add('in');
      root.querySelectorAll('.a5-item')[i].classList.add('seen');
      Audio.play('pop'); Audio.duck(true);
      cat.lookAt(SHELF_X[i], ctx.H - 620);
    };
    ctx.on(root.querySelector('.a5-shelf'), 'click', (e) => { const b = e.target.closest('.a5-item'); if (b && !S.spinning) showTag(+b.dataset.i); });
    ctx.on(S.tag.querySelector('button'), 'click', () => {
      S.tag.hidden = true; Audio.play('tap'); Audio.duck(false); cat.lookAt(null);
      if (S.seen.size >= 2 && !S.pulled) UI.hint(C.hintLever, C.altLever, () => pull());
    });
    UI.hint(C.hintShelf, '直接去摇老虎机', () => UI.hint(C.hintLever, C.altLever, () => pull()));

    // ---- 老虎机 ----
    let takeRes; const taken = new Promise((r) => { takeRes = r; });
    const spin = async () => {
      S.spinning = true; S.result.hidden = true; S.tag.hidden = true; UI.hint(null); Audio.duck(false);
      cat.lookAt(166, S.mTop + 170);
      const targets = C.reels.map((r) => Math.floor(Math.random() * r.length));
      const t0 = performance.now();
      const starts = S.reels.map((r) => r._pos);
      const durs = [1500, 2200, 2900];
      const ends = targets.map((t, i) => { const n = C.reels[i].length; const turns = 3 + i * 2; return Math.floor(starts[i] / n) * n + turns * n + t; });
      const stopped = [false, false, false]; let lastTick = 0;
      await ctx.g(new Promise((res) => {
        const step = () => {
          if (!ctx.alive) return res();
          const now = performance.now() - t0; let all = true;
          for (let i = 0; i < 3; i++) {
            const u = clamp(now / durs[i], 0, 1);
            const k = 1 - Math.pow(1 - u, 3);                // 依次减速
            const over = u < 1 ? 0 : 0;
            self.setReel(ctx, i, lerp(starts[i], ends[i], k) + over);
            if (u >= 1 && !stopped[i]) { stopped[i] = true; Audio.play('reelStop'); S.reels[i].parentNode.animate([{ transform: 'translateY(4px)' }, { transform: 'none' }], { duration: 220 }); }
            if (u < 1) all = false;
          }
          if (now - lastTick > 90) { lastTick = now; Audio.play('tick'); }
          if (!all) requestAnimationFrame(step); else res();
        };
        step();
      }));
      S.idx = targets; S.spinning = false;
      const wish = C.wishPrefix + C.reels[0][targets[0]] + '，' + C.reels[1][targets[1]] + '，' + C.reels[2][targets[2]] + '。';
      S.wish = wish;
      await ctx.wait(300);
      Audio.play('chime'); cat.play('happy');
      S.result.querySelector('p').textContent = wish; S.result.hidden = false; S.result.classList.remove('in'); void S.result.offsetWidth; S.result.classList.add('in');
    };
    const pull = async () => {
      if (S.spinning || S.taking) return;
      S.pulled = true;
      Audio.play('lever'); S.lever.classList.add('down'); setTimeout(() => S.lever.classList.remove('down'), 520);
      await spin();
    };
    let ly0 = 0, dragged = 0;
    ctx.drag(S.lever, {
      start: (p) => { if (S.spinning || S.taking) return false; ly0 = p[1]; dragged = 0; },
      move: (p) => { dragged = clamp(p[1] - ly0, 0, 70); S.lever.style.setProperty('--pull', dragged + 'px'); },
      end: () => { S.lever.style.setProperty('--pull', '0px'); pull(); },
    });
    ctx.on(S.result, 'click', (e) => { const b = e.target.closest('button'); if (!b) return; Audio.play('tap'); if (b.dataset.a === 'again') pull(); else { S.taking = true; takeRes(); } });
    await ctx.g(taken);
    S.result.hidden = true; UI.clear();
    Store.data.wish = S.wish; Store.save();

    // ---- 机器吐出卡片，小猫接住，推给用户 ----
    const card = S.card, slotX = 160, slotY = ctx.H - 192;
    card.hidden = false; card.style.left = (slotX - 60) + 'px'; card.style.top = slotY + 'px';
    Audio.play('whirr');
    await ctx.g(cat.walkTo(66, { speed: 130 }));
    cat.reach(slotX - 30, slotY + 26, { ms: 420 });
    await ctx.anim(card, [{ transform: 'translateY(-78px)', clipPath: 'inset(78px 0 0 0)' }, { transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: 'linear' });
    Audio.play('ding');
    await ctx.g(cat.pat(1, 5));
    // 小猫把卡片扒下来
    const fx = 150, fy = S.gy + 58;
    let follow = true;
    const fl = () => { if (!follow || !ctx.alive) return; const p = cat.joint('pawFN'); card.style.left = (p[0] - 30) + 'px'; card.style.top = (p[1] - 30) + 'px'; requestAnimationFrame(fl); };
    cat.reachMove(fx + 10, fy + 10); fl();
    await ctx.wait(520); follow = false;
    Audio.play('paper');
    await ctx.g(cat.unreach(240));
    // 推给用户
    const cx0 = parseFloat(card.style.left), cy0 = parseFloat(card.style.top);
    const tx = 150, ty = Math.min(ctx.H - 196, S.gy + 40);
    cat.play('pushHold');
    await ctx.wait(420);
    Audio.play('slide');
    await ctx.anim(card, [{ transform: 'none' }, { transform: `translate(${tx - cx0}px,${ty - cy0}px) scale(1.5) rotate(-4deg)` }], { duration: 700, easing: 'cubic-bezier(.2,.7,.3,1)' });
    await ctx.g(cat.play('sit'));
    cat.lookAt(195, ctx.H);
    card.classList.add('ready');
    UI.hint(C.cardHint, C.cardTap, () => card.click());
    await ctx.tap(card);
    UI.clear(); Audio.play('paper');
    card.classList.remove('ready'); card.style.zIndex = 40;
    await ctx.anim(card, [{ transform: `translate(${tx - cx0}px,${ty - cy0}px) scale(1.5) rotate(-4deg)` }, { transform: `translate(${195 - 60 - cx0}px,${ctx.H / 2 - 40 - cy0}px) scale(9) rotate(0deg)` }], { duration: 800, easing: 'cubic-bezier(.6,0,.8,.5)' });
    return { type: 'veil', color: '#f1e3c4', ms: 160 };
  },
};
