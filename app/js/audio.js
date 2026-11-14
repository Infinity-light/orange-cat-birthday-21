// 声音：全部用 WebAudio 现场合成，没有外部音频文件。
// 由用户主动开启（Audio.enable 必须在点击里调用），随时可以关闭。
let ctx = null, master = null, musicBus = null, sfxBus = null, delay = null;
let enabled = false, musicTimer = null, noiseBuf = null;
let duckLevel = 1;
const MUSIC = 0.8;   // 背景音乐音量

function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = MUSIC; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  // 简单的回声当混响
  delay = ctx.createDelay(1); delay.delayTime.value = 0.31;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  delay.connect(lp); lp.connect(fb); fb.connect(delay);
  const wet = ctx.createGain(); wet.gain.value = 0.35; lp.connect(wet); wet.connect(musicBus);
  // 噪声
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi → Hz

// 八音盒音色
function bell(freq, t, vel = 0.5, dur = 1.6, bus) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 3.01;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.22, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vel * 0.05, t + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.3);
  o.connect(g); o2.connect(g2); g.connect(bus || musicBus); g2.connect(bus || musicBus);
  if (!bus) { g.connect(delay); }
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur * 0.3 + 0.05);
}
function pad(freq, t, dur, vel = 0.05) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = 700;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
}

// 一段 16 小节的小曲子（C 大调，3/4 拍，慢）
const CHORDS = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59], [48, 55, 64], [40, 47, 55], [41, 48, 57], [43, 50, 59]];
const MELODY = [
  [76, 0, 79], [72, 0, 0], [69, 72, 0], [74, 0, 71],
  [76, 0, 84], [83, 0, 79], [81, 77, 0], [79, 0, 0],
  [72, 76, 79], [76, 0, 72], [77, 0, 81], [74, 0, 0],
  [79, 0, 76], [71, 0, 74], [72, 69, 0], [67, 0, 0],
];
let bar = 0, nextT = 0;
const BEAT = 0.62;
function schedule() {
  if (!enabled || !ctx) return;
  while (nextT < ctx.currentTime + 1.2) {
    const ch = CHORDS[bar % CHORDS.length], mel = MELODY[bar % MELODY.length];
    pad(N(ch[0]), nextT, BEAT * 3.1, 0.05); pad(N(ch[1]), nextT, BEAT * 3.1, 0.03);
    // 30 秒一遍的旋律连着听十分钟会腻：三遍一轮——原样 / 低八度更轻 / 只留每小节第一个音，给耳朵留白
    const pass = Math.floor(bar / MELODY.length) % 3;
    for (let b = 0; b < 3; b++) {
      bell(N(ch[b] + 12), nextT + b * BEAT + 0.01, 0.22, 1.4);
      if (!mel[b]) continue;
      if (pass === 0) bell(N(mel[b]), nextT + b * BEAT, 0.55, 2.2);
      else if (pass === 1) bell(N(mel[b] - 12), nextT + b * BEAT, 0.42, 2.4);
      else if (b === 0) bell(N(mel[b]), nextT, 0.4, 2.8);
    }
    nextT += BEAT * 3; bar++;
  }
}

function noise(t, dur, { type = 'bandpass', freq = 2000, q = 1, vol = 0.3, attack = 0.005, freqEnd } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
function tone(t, dur, freq, { type = 'sine', vol = 0.2, freqEnd, attack = 0.004 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}

const SFX = {
  tear(v = 1) { const t = ctx.currentTime; for (let i = 0; i < 3; i++) noise(t + i * 0.022 + Math.random() * 0.01, 0.05 + Math.random() * 0.05, { type: 'bandpass', freq: 2600 + Math.random() * 2600, q: 0.7, vol: 0.22 * v }); },
  rip() { const t = ctx.currentTime; noise(t, 0.5, { type: 'bandpass', freq: 1800, freqEnd: 5200, q: 0.6, vol: 0.4 }); for (let i = 0; i < 8; i++) noise(t + i * 0.05, 0.06, { freq: 3000 + Math.random() * 3000, vol: 0.2 }); },
  thump() { const t = ctx.currentTime; tone(t, 0.16, 110, { freqEnd: 60, vol: 0.2 }); noise(t, 0.08, { type: 'lowpass', freq: 400, vol: 0.12 }); },
  step() { const t = ctx.currentTime; noise(t, 0.05, { type: 'lowpass', freq: 500 + Math.random() * 200, vol: 0.1 }); tone(t, 0.05, 150 + Math.random() * 40, { freqEnd: 90, vol: 0.05 }); },
  land() { const t = ctx.currentTime; tone(t, 0.14, 130, { freqEnd: 60, vol: 0.3 }); noise(t, 0.09, { type: 'lowpass', freq: 600, vol: 0.2 }); },
  jump() { const t = ctx.currentTime; noise(t, 0.16, { type: 'bandpass', freq: 500, freqEnd: 1800, q: 1.2, vol: 0.1 }); },
  shutter() { const t = ctx.currentTime; noise(t, 0.03, { type: 'highpass', freq: 3000, vol: 0.3 }); tone(t, 0.05, 180, { freqEnd: 80, vol: 0.2 }); noise(t + 0.09, 0.04, { type: 'highpass', freq: 2500, vol: 0.24 }); },
  whirr() { const t = ctx.currentTime; tone(t, 0.9, 210, { type: 'sawtooth', vol: 0.035, freqEnd: 250 }); noise(t, 0.9, { type: 'bandpass', freq: 900, q: 3, vol: 0.07, attack: 0.1 }); },
  slide() { const t = ctx.currentTime; noise(t, 0.3, { type: 'bandpass', freq: 1500, freqEnd: 2600, q: 0.8, vol: 0.14, attack: 0.05 }); },
  paper() { const t = ctx.currentTime; noise(t, 0.18, { type: 'bandpass', freq: 3200, q: 0.6, vol: 0.14, attack: 0.03 }); noise(t + 0.08, 0.12, { type: 'bandpass', freq: 2200, q: 0.6, vol: 0.1, attack: 0.02 }); },
  pop() { const t = ctx.currentTime; tone(t, 0.09, 520, { freqEnd: 880, vol: 0.16 }); },
  tap() { const t = ctx.currentTime; tone(t, 0.06, 700, { freqEnd: 500, vol: 0.1, type: 'triangle' }); },
  click() { const t = ctx.currentTime; noise(t, 0.02, { type: 'highpass', freq: 2000, vol: 0.3 }); tone(t, 0.03, 300, { vol: 0.15 }); },
  ding() { const t = ctx.currentTime; bell(N(88), t, 0.9, 1.6, sfxBus); bell(N(93), t + 0.09, 0.7, 1.8, sfxBus); },
  chime() { const t = ctx.currentTime;[72, 76, 79, 84].forEach((n, i) => bell(N(n), t + i * 0.11, 0.7, 1.8, sfxBus)); },
  tick() { const t = ctx.currentTime; tone(t, 0.03, 1100 + Math.random() * 120, { type: 'square', vol: 0.045 }); noise(t, 0.015, { type: 'highpass', freq: 4000, vol: 0.08 }); },
  reelStop() { const t = ctx.currentTime; tone(t, 0.1, 220, { freqEnd: 120, vol: 0.3 }); noise(t, 0.04, { type: 'bandpass', freq: 1500, vol: 0.2 }); bell(N(79), t + 0.02, 0.5, 0.9, sfxBus); },
  lever() { const t = ctx.currentTime; noise(t, 0.2, { type: 'bandpass', freq: 700, freqEnd: 300, q: 2, vol: 0.25 }); tone(t + 0.18, 0.08, 160, { freqEnd: 90, vol: 0.3 }); },
  scratch(v = 1) { const t = ctx.currentTime; noise(t, 0.06, { type: 'highpass', freq: 4200, vol: 0.1 * v, attack: 0.01 }); },
  whoosh() { const t = ctx.currentTime; noise(t, 0.5, { type: 'bandpass', freq: 400, freqEnd: 1600, q: 0.9, vol: 0.2, attack: 0.2 }); },
  lamp() { const t = ctx.currentTime; noise(t, 0.02, { type: 'highpass', freq: 1800, vol: 0.3 }); bell(N(81), t + 0.03, 0.4, 1.2, sfxBus); },
  candle() { const t = ctx.currentTime; noise(t, 0.35, { type: 'bandpass', freq: 1200, freqEnd: 3000, q: 0.5, vol: 0.12, attack: 0.12 }); bell(N(84), t + 0.15, 0.4, 1.6, sfxBus); },
  door() { const t = ctx.currentTime; tone(t, 0.5, 190, { type: 'triangle', freqEnd: 260, vol: 0.07, attack: 0.1 }); noise(t + 0.4, 0.1, { type: 'lowpass', freq: 500, vol: 0.2 }); bell(N(91), t + 0.45, 0.5, 1.4, sfxBus); bell(N(86), t + 0.6, 0.4, 1.4, sfxBus); },
  meow() { const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1500, t + 0.12); f.frequency.linearRampToValueAtTime(1000, t + 0.34); f.Q.value = 4;
    o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(760, t + 0.1); o.frequency.linearRampToValueAtTime(600, t + 0.34);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.05); g.gain.linearRampToValueAtTime(0.07, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.4); },
};

export const Audio = {
  get enabled() { return enabled; },
  enable() {
    init(); if (!ctx) return;
    enabled = true;
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    nextT = ctx.currentTime + 0.3;
    clearInterval(musicTimer); musicTimer = setInterval(schedule, 300); schedule();
  },
  disable() {
    enabled = false; clearInterval(musicTimer);
    if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.08); }
  },
  toggle() { if (enabled) this.disable(); else this.enable(); return enabled; },
  // 重要文字出现时把音乐压低，给阅读留出空间
  duck(on) { duckLevel = on ? 0.35 : 1; if (ctx) musicBus.gain.setTargetAtTime(MUSIC * duckLevel, ctx.currentTime, 0.6); },
  play(name, arg) { if (!enabled || !ctx || !SFX[name]) return; try { SFX[name](arg); } catch (e) { /* ignore */ } },
  // 调试用：返回当前输出的峰值（0~1），用来确认有声音且不爆音
  debugPeak() {
    if (!ctx) return -1;
    if (!this._an) { this._an = ctx.createAnalyser(); this._an.fftSize = 2048; master.connect(this._an); }
    const d = new Float32Array(2048); this._an.getFloatTimeDomainData(d);
    let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m;
  },
  get state() { return ctx ? ctx.state : 'none'; },
  suspendForHidden(hidden) { if (!ctx) return; if (hidden) ctx.suspend(); else if (enabled) ctx.resume(); },
};
document.addEventListener('visibilitychange', () => Audio.suspendForHidden(document.hidden));
// iOS 来电、切到后台再回来时 AudioContext 可能停在 interrupted / suspended：下一次触摸时把它叫醒（只在用户已经开了声音的前提下）
document.addEventListener('pointerdown', () => { if (enabled && ctx && ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {}); }, { passive: true });
