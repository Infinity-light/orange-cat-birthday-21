// 小橘猫 · 动作工程（数据）
// POSES：关键姿势（只写与静立姿势不同的参数，参数含义见 rig.js 的 BASE）
// CLIPS：动作片段 = 关键姿势序列。step: { pose, ms, ease, hold }
//   pose 可以是 POSES 里的名字或内联对象；ms 过渡时长；hold 到位后停留毫秒
// 行走（walk/run）是程序化步态，见 cat.js 的 gaitPose；伸爪（reach）可跟随任意目标点，见 Cat.reach。

export const POSES = {
  stand: {},
  // 坐下：臀部落地，前身抬起，前腿撑直
  sit: { bodyX: -8, bodyY: 15, pitch: 44, stretch: 0.86, arch: 3, headX: -7, headY: 3, fnX: -19, ffX: -21, hnX: 18, hfX: 16, tailA: 62, tailCurl: -4 },
  // 趴下：肚子贴地，前爪向前伸，下巴压低
  lie: { bodyY: 27, pitch: 2, stretch: 1.02, headX: 6, headY: 12, fnX: 43, fnY: 1, ffX: 37, ffY: 1, hnX: 12, hfX: 10, tailA: 28, tailCurl: -14, tailWave: 0.5 },
  lieSleepy: { bodyY: 28, pitch: 0, stretch: 1.02, headX: 9, headY: 19, tilt: 5, blink: 0.72, fnX: 43, fnY: 1, ffX: 37, ffY: 1, hnX: 12, hfX: 10, tailA: 30, tailCurl: -16, tailWave: 0.3 },
  // 回头
  lookBack: { turn: -1, headX: -13, headY: 1, tilt: -7, earL: 6, pitch: 2, tailCurl: 4 },
  lookFront: { turn: 1, headX: 3 },
  lookUp: { headY: -5, lookY: -1.6, pitch: 4, tilt: -3 },
  curious: { tilt: 11, headX: 2, headY: -2, earR: -8, lookY: -0.4 },
  // 探头：前身压低前探，脖子伸长
  peekLow: { bodyX: -8, bodyY: 12, pitch: -10, headX: 2, headY: 10, hnX: -4, hfX: -4, fnX: -4, ffX: -4, tailA: 12, earL: -10, earR: -10 },
  peekOut: { bodyX: 6, bodyY: 6, pitch: -6, stretch: 1.08, headX: 14, headY: 2, tilt: 8, lookX: 1.2, earL: 5, earR: 5, tailA: 18, tailCurl: 6 },
  // 伸爪（固定版，用于演示；跟手版见 Cat.reach）
  reachPrep: { bodyX: -5, bodyY: 3, pitch: 3, headX: -2, fnX: -8, fnY: -9, fnA: 25, shX: -2, lookX: 1, tailCurl: 5 },
  reachOut: { bodyX: 9, bodyY: 1, pitch: 8, stretch: 1.06, headX: 4, headY: 1, tilt: 6, fnX: 52, fnY: -38, fnA: -30, shX: 6, shY: -3, lookX: 1.6, lookY: -0.3, hnX: -3, tailA: 14, tailCurl: 6 },
  reachPat: { bodyX: 10, bodyY: 2, pitch: 7, stretch: 1.06, headX: 5, headY: 2, tilt: 8, fnX: 54, fnY: -27, fnA: 6, shX: 7, shY: -2, lookX: 1.6, lookY: 0.3, hnX: -3, tailA: 14, tailCurl: 6 },
  // 推东西：两只前爪顶住，后腿蹬地，身体前倾
  pushPrep: { bodyX: -6, bodyY: 5, pitch: 6, headX: -3, headY: 3, fnX: 4, fnY: -22, fnA: -50, ffX: 2, ffY: -24, ffA: -50, hnX: 4, hfX: 4 },
  pushGo: { bodyX: 12, bodyY: 3, pitch: 4, stretch: 1.1, headX: 4, headY: 6, tilt: 4, fnX: 22, fnY: -26, fnA: -70, ffX: 16, ffY: -30, ffA: -70, shX: 5, hnX: -12, hfX: -14, hnA: 16, hfA: 16, earL: -14, earR: -14, tailA: 30, tailCurl: -10, blink: 0.25 },
  // 踩（按快门）：抬爪 → 踩下
  stepUp: { bodyX: 2, pitch: 6, fnX: 14, fnY: -30, fnA: 10, shY: -2, headX: 2, lookX: 1.2, lookY: 0.6 },
  stepDown: { bodyX: 5, bodyY: 2, pitch: 2, fnX: 16, fnY: -17, fnA: 4, shX: 2, headX: 4, headY: 4, lookX: 1.2, lookY: 1.2 },
  // 跳跃
  jumpCrouch: { bodyX: -7, bodyY: 15, pitch: -9, stretch: 0.9, arch: 5, headX: 2, headY: 5, lookX: 1, earL: -12, earR: -12, tailA: 26, tailCurl: -8, hnX: 6, hfX: 6 },
  jumpLaunch: { bodyX: 8, bodyY: -8, pitch: 30, stretch: 1.16, headX: 6, headY: -3, fnX: 20, fnY: -44, fnA: -30, ffX: 22, ffY: -50, ffA: -30, hnX: -22, hfX: -18, hnA: 28, hfA: 28, tailA: 40, tailCurl: -14 },
  jumpAir: { bodyY: -4, pitch: 8, stretch: 1.08, arch: 4, headX: 4, fnX: 16, fnY: -22, fnA: -10, ffX: 18, ffY: -26, ffA: -10, hnX: -8, hnY: -20, hfX: -4, hfY: -24, hnA: 30, hfA: 30, tailA: 30, tailCurl: -10, earL: -8, earR: -8 },
  jumpReach: { bodyY: -2, pitch: -16, stretch: 1.1, headX: 3, headY: 4, fnX: 20, fnY: -6, fnA: 20, ffX: 26, ffY: -10, ffA: 20, hnX: -18, hnY: -26, hfX: -12, hfY: -30, hnA: 40, hfA: 40, tailA: 50, tailCurl: -16 },
  jumpLand: { bodyX: 3, bodyY: 13, pitch: -7, stretch: 0.9, arch: 4, headX: 3, headY: 9, blink: 0.35, fnX: 4, ffX: 4, hnX: 4, hfX: 4, tailA: 34, tailCurl: -4 },
  // 从纸包里探出来（躯干竖起，藏在纸后面）
  boxHide: { bodyX: -20, bodyY: 50, pitch: 58, stretch: 0.9, headX: -8, headY: 26, fnX: -30, fnY: -20, ffX: -34, ffY: -22, hnX: 10, hfX: 10, tailWave: 0.2, earL: -8, earR: -8 },
  boxPeek: { bodyX: -18, bodyY: 26, pitch: 60, stretch: 0.92, headX: -6, headY: 8, tilt: 7, fnX: -24, fnY: -36, ffX: -30, ffY: -40, hnX: 10, hfX: 10, tailWave: 0.2, lookY: -0.6 },
  boxOut: { bodyX: -14, bodyY: 10, pitch: 62, stretch: 0.96, headX: -4, headY: 0, tilt: -4, fnX: 2, fnY: -50, fnA: 12, ffX: -86, ffY: -42, ffA: 170, shX: 4, hnX: 10, hfX: 10, tailWave: 0.2 },
  boxSpread: { bodyX: -12, bodyY: 6, pitch: 60, stretch: 1, headX: -4, headY: -2, blink: 0.3, fnX: 20, fnY: -50, fnA: -20, ffX: -98, ffY: -48, ffA: 200, shX: 6, hnX: 10, hfX: 10, earL: -12, earR: -12, tailWave: 0.2 },
};

export const CLIPS = {
  stand: [{ pose: 'stand', ms: 380 }],
  sit: [{ pose: { bodyY: 6, pitch: 12, hnX: 6, hfX: 6 }, ms: 160, ease: 'in' }, { pose: 'sit', ms: 360, ease: 'out' }],
  lie: [{ pose: { bodyY: 12, pitch: -8, headY: 6 }, ms: 260, ease: 'in' }, { pose: 'lie', ms: 480, ease: 'out' }],
  sleep: [{ pose: 'lie', ms: 500 }, { pose: 'lieSleepy', ms: 1400, ease: 'io' }],
  lookBack: [{ pose: 'lookBack', ms: 360, ease: 'out', hold: 900 }, { pose: 'stand', ms: 360 }],
  lookBackHold: [{ pose: 'lookBack', ms: 360, ease: 'out' }],
  curious: [{ pose: 'curious', ms: 300, ease: 'out', hold: 700 }, { pose: 'stand', ms: 300 }],
  peek: [{ pose: 'peekLow', ms: 320, ease: 'out', hold: 200 }, { pose: 'peekOut', ms: 420, ease: 'back', hold: 900 }, { pose: 'stand', ms: 380 }],
  reach: [
    { pose: 'reachPrep', ms: 220, ease: 'out' },         // 预备：重心后移，爪子收起
    { pose: 'reachOut', ms: 300, ease: 'back', hold: 260 }, // 伸出：肩膀前送，前腿伸直
    { pose: 'reachPat', ms: 120, ease: 'in' },           // 拍一下
    { pose: 'reachOut', ms: 160, ease: 'out', hold: 200 },
    { pose: 'reachPat', ms: 120, ease: 'in' },
    { pose: 'reachOut', ms: 160, ease: 'out', hold: 260 },
    { pose: 'reachPrep', ms: 240, ease: 'io' },          // 收回
    { pose: 'stand', ms: 260, ease: 'out' },
  ],
  push: [
    { pose: 'pushPrep', ms: 260, ease: 'out', hold: 120 },
    { pose: 'pushGo', ms: 420, ease: 'io', hold: 300 },
    { pose: 'pushPrep', ms: 240 },
    { pose: 'stand', ms: 280 },
  ],
  pushHold: [{ pose: 'pushPrep', ms: 260, ease: 'out', hold: 100 }, { pose: 'pushGo', ms: 420, ease: 'io' }],
  step: [
    { pose: 'stepUp', ms: 240, ease: 'out', hold: 120 },
    { pose: 'stepDown', ms: 110, ease: 'in', hold: 260 },
    { pose: 'stepUp', ms: 200, ease: 'out' },
    { pose: 'stand', ms: 260 },
  ],
  // 原地跳（展示用；带位移的跳跃见 Cat.jumpTo）
  jump: [
    { pose: 'jumpCrouch', ms: 240, ease: 'out', hold: 90 },
    { pose: 'jumpLaunch', ms: 110, ease: 'in' },
    { pose: 'jumpAir', ms: 220, ease: 'out' },
    { pose: 'jumpReach', ms: 200, ease: 'io' },
    { pose: 'jumpLand', ms: 90, ease: 'in', hold: 60 },
    { pose: 'stand', ms: 320, ease: 'back' },
  ],
  nod: [{ pose: { headY: 6, lookY: 1 }, ms: 150 }, { pose: {}, ms: 180 }, { pose: { headY: 5, lookY: 1 }, ms: 150 }, { pose: {}, ms: 200 }],
  shake: [{ pose: { turn: -0.6 }, ms: 140 }, { pose: { turn: 0.6 }, ms: 200 }, { pose: { turn: -0.4 }, ms: 180 }, { pose: {}, ms: 180 }],
  happy: [{ pose: { happy: 1, headY: -3, tilt: 6, tailCurl: 8 }, ms: 200, hold: 800 }, { pose: {}, ms: 260 }],
};

export const CLIP_LABELS = {
  stand: '等待', curious: '歪头', lookBack: '回头', peek: '探头', reach: '伸爪', push: '推东西',
  step: '踩', jump: '跳跃', sit: '坐下', lie: '趴下', sleep: '打盹', nod: '点头', shake: '摇头', happy: '开心',
};
