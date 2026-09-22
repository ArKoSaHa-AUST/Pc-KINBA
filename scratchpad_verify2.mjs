import { chromium } from 'playwright';
const OUT = 'C:/Users/Dhrubo/AppData/Local/Temp/claude/e--Pc-KINBA/4ca7fac7-2e86-40ba-a773-c1f1f10270bd/scratchpad/shots';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);

await page.goto(BASE + '/product/0712eabf-38ef-4c60-84f5-0585bdb9f54a', { waitUntil: 'domcontentloaded' });
try {
  await page.waitForSelector('#alternative-parts', { timeout: 5000 });
  await page.waitForFunction(() => {
    const sec = document.querySelector('#alternative-parts');
    return sec && sec.querySelectorAll('a, button').length > 10;
  }, { timeout: 15000 });
} catch (e) { console.log('wait warning:', e.message); }
await page.waitForTimeout(1000);

// Measure section boundaries precisely
const info = await page.evaluate(() => {
  const root = document.querySelector('.min-h-screen.relative.overflow-hidden');
  if (!root) return null;
  return Array.from(root.children).map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, id: el.id, top: Math.round(r.top + window.scrollY), height: Math.round(r.height) };
  });
});
console.log(JSON.stringify(info, null, 2));

await page.screenshot({ path: `${OUT}/product-fixed2-full.png`, fullPage: true });
const height = await page.evaluate(() => document.body.scrollHeight);
console.log('page height:', height);
await browser.close();
