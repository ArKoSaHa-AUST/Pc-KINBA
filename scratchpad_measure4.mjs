import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);
await page.goto(BASE + '/product/0712eabf-38ef-4c60-84f5-0585bdb9f54a', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const matches = document.querySelectorAll('.min-h-screen');
  const results = [];
  matches.forEach((root, idx) => {
    results.push({
      matchIndex: idx,
      cls: String(root.getAttribute('class')||''),
      childCount: root.children.length,
      children: Array.from(root.children).map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id,
          cls: String(el.getAttribute('class')||'').slice(0,90),
          top: Math.round(r.top + window.scrollY),
          height: Math.round(r.height),
          inlineStyle: el.getAttribute('style')
        };
      })
    });
  });
  return results;
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
