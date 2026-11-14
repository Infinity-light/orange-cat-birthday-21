// 通用分步截图：node tools/shot-seq.mjs <act> <tag> "步骤;步骤;…"
// 步骤：hint:词（等提示出现）| alt（点替代按钮）| cta（点继续）| click:选择器 | wait:毫秒 | shot:名字 | sel:选择器（等元素出现）
import { open, BASE, sleep } from './pw.mjs';
const [act, tag, steps] = process.argv.slice(2);
const { browser, page, errors } = await open({ viewport: { width: +process.env.VW || 390, height: +process.env.VH || 844 } });
await page.goto(BASE + '/index.html?act=' + act);
for (const st of steps.split(';')) {
  const i = st.indexOf(':'); const k = i < 0 ? st : st.slice(0, i), v = i < 0 ? '' : st.slice(i + 1);
  try {
    if (k === 'hint') await page.waitForFunction((t) => { const e = document.querySelector('.hint'); return e && !e.hidden && e.textContent.includes(t); }, v, { timeout: 60000 });
    else if (k === 'alt') { await sleep(250); await page.click('.hint-alt'); }
    else if (k === 'cta') { await page.waitForSelector('.cta:not([hidden])', { timeout: 60000 }); await sleep(350); await page.click('.cta'); }
    else if (k === 'click') { await page.waitForSelector(v, { state: 'visible', timeout: 30000 }); await sleep(200); await page.click(v); }
    else if (k === 'sel') await page.waitForSelector(v, { state: 'visible', timeout: 60000 });
    else if (k === 'wait') await sleep(+v);
    else if (k === 'shot') await page.screenshot({ path: `shots/${tag}-${v}.png` });
  } catch (e) { console.log('step failed:', st, e.message.split('\n')[0]); await page.screenshot({ path: `shots/${tag}-FAIL.png` }); break; }
}
console.log(errors.join('\n') || 'ok'); await browser.close();
