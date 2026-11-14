// node tools/montage.mjs out.png a.png b.png ...  把多张截图横向拼成一张（方便自评）
import { open } from './pw.mjs'; import fs from 'node:fs'; import path from 'node:path';
const [out, ...files] = process.argv.slice(2);
const cols = +process.env.COLS || Math.min(files.length, 5); const w = +process.env.CW || 300;
const { browser, page } = await open({ viewport: { width: cols * (w + 8) + 8, height: 800 }, dpr: 1, mobile: false, touch: false });
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f)}</figcaption></figure>`).join('');
await page.setContent(`<body style="margin:8px;background:#222;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:8px;font:11px sans-serif;color:#ccc">${imgs}<style>figure{margin:0}img{width:${w}px;display:block}</style></body>`);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
