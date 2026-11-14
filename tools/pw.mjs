// 截图/走查公用：加载 playwright（先找本仓库 npm install 装的，找不到再找全局安装的）
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
let pw;
try { pw = createRequire(import.meta.url)('playwright'); }
catch { pw = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright'); }
export { pw };
export const BASE = process.env.BASE || 'http://localhost:8331';
export async function open(opts = {}) {
  const engine = opts.engine || 'chromium';
  const browser = await pw[engine].launch(engine === 'chromium' ? { headless: true, channel: 'chrome' } : { headless: true });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: opts.dpr || 2, hasTouch: opts.touch !== false, isMobile: engine !== 'firefox' && opts.mobile !== false, userAgent: opts.ua, ...(opts.video ? { recordVideo: { dir: opts.video, size: opts.viewport || { width: 390, height: 844 } } } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return { browser, ctx, page, errors };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
