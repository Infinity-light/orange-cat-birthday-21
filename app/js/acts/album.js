// 回忆册（把照片、文字、地点、留言整理起来）与生日纪念卡（可保存的图片）
import { CONTENT } from '../content.js';
import { $, h, esc, nl2br, Store } from '../core.js';
import { Audio } from '../audio.js';

export function openAlbum() {
  const A = CONTENT.album, c = CONTENT, wish = Store.data.wish;
  const sec = (title, body) => `<section><h3>${esc(title)}</h3>${body}</section>`;
  const html = `
    <div class="overlay-page album"><div class="album-in">
      <header><span>${esc(c.person.year)} · ${esc(c.person.birthdayShort)}</span><h2>${esc(A.title)}</h2></header>
      ${sec(A.sections.photos, c.act2.photos.map((p) => `<figure class="al-photo"><img src="${esc(p.src)}" alt="" loading="lazy"><figcaption><span>${esc(p.date)}</span>${esc(p.caption)}<small>${nl2br(p.back)}</small><small class="hl">${esc(p.hotspot.label)}：${esc(p.hotspot.text)}</small></figcaption></figure>`).join(''))}
      ${sec(A.sections.year, c.act3.nodes.map((n) => `<article class="al-node"><img src="${esc(n.src)}" alt="" loading="lazy"><div><b><i>${esc(n.date)}</i>${esc(n.title)}</b><p>${nl2br(n.text)}</p>${n.noteText ? `<p class="q">${nl2br(n.noteText)}</p>` : ''}${n.more ? `<p>${nl2br(n.more)}</p>` : ''}</div></article>`).join(''))}
      ${sec(A.sections.places, c.act4.places.map((p) => `<article class="al-place"><b>${esc(p.name)}<i>${esc(p.sub)}</i></b>${p.src ? `<img src="${esc(p.src)}" alt="" loading="lazy">` : ''}${p.chat ? `<div class="chat">${p.chat.map((m) => `<div class="bubble ${m.me ? 'me' : ''}"><i>${esc(m.who)}</i><span>${esc(m.text)}</span></div>`).join('')}</div>` : ''}<p>${nl2br(p.text)}</p></article>`).join(''))}
      ${A.sections.shelf ? sec(A.sections.shelf, c.act5.shelf.map((it) => `<p class="al-shelf"><b>${esc(it.label)}</b>${esc(it.text)}</p>`).join('')) : ''}
      ${wish ? sec(A.sections.wish, `<p class="al-wish">${esc(wish)}</p>`) : ''}
      ${sec(A.sections.letter, `<div class="al-letter">${c.act6.letter.map((t) => `<p>${esc(t)}</p>`).join('')}</div>`)}
      ${sec(A.sections.notes, c.act6.notes.map((n, i) => `<div class="al-note n${i % 4}"><p>${nl2br(n.text)}</p><em>—— ${esc(n.from)}</em></div>`).join(''))}
      <section class="al-end"><p>${esc(c.act7.blessing)}</p><em>${esc(c.act7.sign)}</em></section>
    </div><button type="button" class="btn primary al-close">${esc(A.close)}</button></div>`;
  const el = h(html);
  $('#ui').appendChild(el);
  Audio.play('paper');
  el.querySelector('.al-close').onclick = () => { Audio.play('tap'); el.classList.add('out'); setTimeout(() => el.remove(), 300); };
}

function loadImg(src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }

// 画一张 900×1200 的纪念卡
async function drawCard(cat) {
  const K = CONTENT.keepsake, P = CONTENT.person, W = 900, H = 1200;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const F = (px) => `${px}px Wenkai, "Kaiti SC", STKaiti, KaiTi, serif`;
  if (document.fonts && document.fonts.load) { try { await Promise.race([document.fonts.load(F(40), K.line + P.name), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* */ } }
  // 背景：生日房间那张底图，先缩得很小再放大（等于一层很重的虚化），压暗，留一圈暗角
  const room = await loadImg('assets/scene/a7-plate.webp');
  g.fillStyle = '#14100b'; g.fillRect(0, 0, W, H);
  if (room) {
    const sm = document.createElement('canvas'); sm.width = 36; sm.height = 48; const sg = sm.getContext('2d');
    sg.drawImage(room, 0, room.naturalHeight * 0.38, room.naturalWidth, room.naturalWidth * 4 / 3, 0, 0, 36, 48);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, W, H);
  }
  g.fillStyle = 'rgba(12,9,5,.42)'; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,236,196,.5)'; g.lineWidth = 2; g.strokeRect(40, 40, W - 80, H - 80);
  g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14;
  g.fillStyle = 'rgba(246,236,211,.75)'; g.font = F(28);
  g.fillText(`${P.year} · ${P.birthdayShort}`, W / 2, 128);
  g.fillStyle = '#ffdca6'; g.font = F(82); g.fillText(K.line, W / 2, 232);
  g.fillStyle = '#f6ecd3'; g.font = F(44); g.fillText(P.name, W / 2, 308);
  g.shadowColor = 'transparent'; g.shadowBlur = 0;
  // 照片（拍立得）
  const photo = await loadImg(K.photo);
  g.save(); g.translate(W / 2 - 30, 612); g.rotate(-0.045);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 44; g.shadowOffsetY = 18;
  const pg = g.createLinearGradient(-230, -250, 230, 290); pg.addColorStop(0, '#fdfaf1'); pg.addColorStop(1, '#ebe4d2');
  g.fillStyle = pg; g.fillRect(-230, -250, 460, 540);
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  if (photo) { try { g.drawImage(photo, -205, -225, 410, 410); } catch (e) { g.fillStyle = '#3a4a44'; g.fillRect(-205, -225, 410, 410); } } else { g.fillStyle = '#3a4a44'; g.fillRect(-205, -225, 410, 410); }
  g.fillStyle = '#6a4a30'; g.font = F(28); g.fillText(K.sub, 0, 248);
  g.restore();
  // 小猫：趴着睡着的那张
  const kit = await loadImg('assets/cat/sleep.webp');
  if (kit) {
    const kw = 430, kh = kw * kit.naturalHeight / kit.naturalWidth, kx = W - kw - 34, ky = 922 - kh;
    g.save(); g.translate(kx + kw / 2, ky + kh - 4); g.scale(1, 0.16);
    const sh = g.createRadialGradient(0, 0, 10, 0, 0, kw * 0.52); sh.addColorStop(0, 'rgba(0,0,0,.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, kw * 0.52, 0, 7); g.fill(); g.restore();
    g.drawImage(kit, kx, ky, kw, kh);
  }
  // 愿望
  const wish = Store.data.wish || (CONTENT.act5.wishPrefix + CONTENT.act5.reels.map((r) => r[0]).join('，') + '。');
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14; g.fillStyle = '#ffdca6'; g.font = F(40);
  const parts = wish.length > 18 ? [wish.slice(0, wish.indexOf('，') + 1), wish.slice(wish.indexOf('，') + 1)] : [wish];
  parts.forEach((t, i) => g.fillText(t, W / 2, 1010 + i * 56));
  g.fillStyle = 'rgba(246,236,211,.78)'; g.font = F(26); g.fillText(CONTENT.act7.sign, W / 2, 1128);
  return cv;
}

export async function openKeepsake(cat) {
  const K = CONTENT.keepsake;
  const el = h(`<div class="overlay-page keep"><div class="keep-in"><h2>${esc(K.title)}</h2><div class="keep-img"><p>正在冲印…</p></div><p class="keep-hint">${esc(K.saveHint)}</p><div class="row"><a class="btn primary" download="生日纪念卡.png">${esc(K.download)}</a><button type="button" class="btn">${esc(K.close)}</button></div></div></div>`);
  $('#ui').appendChild(el);
  el.querySelector('button').onclick = () => { Audio.play('tap'); el.remove(); };
  Audio.play('shutter');
  try {
    const cv = await drawCard(cat);
    let url;
    try { url = cv.toDataURL('image/png'); } catch (e) { url = null; }
    const box = el.querySelector('.keep-img');
    box.innerHTML = '';
    if (url) { const im = new Image(); im.src = url; im.alt = K.title; box.appendChild(im); el.querySelector('a').href = url; }
    else { box.appendChild(cv); el.querySelector('a').remove(); el.querySelector('.keep-hint').textContent = '这个浏览器不能直接导出图片，请截图保存。'; }
  } catch (e) { el.querySelector('.keep-img').innerHTML = '<p>纪念卡生成失败，请截图保存这一幕。</p>'; }
}
