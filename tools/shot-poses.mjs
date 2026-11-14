// node tools/shot-poses.mjs out.png "query"
import { open, BASE, sleep } from './pw.mjs';
const [out, query = ''] = process.argv.slice(2);
const { browser, page, errors } = await open({ viewport: { width: +process.env.VW || 1220, height: +process.env.VH || 780 }, dpr: 1, mobile: false, touch: false });
await page.goto(BASE + '/cat-test.html?' + query); await page.waitForFunction(() => window.ready, null, { timeout: 20000 }); await sleep(900);
await page.screenshot({ path: out, fullPage: true }); console.log(errors.join('\n') || 'ok'); await browser.close();
