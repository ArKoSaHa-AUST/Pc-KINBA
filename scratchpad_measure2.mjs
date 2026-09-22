import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);
await page.goto(BASE + '/components', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  const main = document.querySelector('main') || document.body;
  const kids = Array.from(main.children);
  const secs = kids.map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: (el.className||'').toString().slice(0,70), top: Math.round(r.top + window.scrollY), height: Math.round(r.height) };
  });
  // grid gap check
  const grid = document.querySelector('[class*="grid"]');
  const gridInfo = grid ? { cls: String(grid.getAttribute('class')||'').slice(0,80), gap: getComputedStyle(grid).gap } : null;
  return { secs, gridInfo, totalHeight: document.body.scrollHeight };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
