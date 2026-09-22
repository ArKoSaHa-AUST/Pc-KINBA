import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);
await page.goto(BASE + '/', { waitUntil: 'networkidle' });

const height = await page.evaluate(() => document.body.scrollHeight);
let y = 0;
while (y < height) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(200);
  y += 400;
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

const sections = await page.evaluate(() => {
  const root = document.querySelector('main') || document.body;
  const kids = Array.from(root.children).filter(el => el.tagName !== 'SCRIPT');
  return kids.map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: (el.className||'').toString().slice(0,60), top: Math.round(r.top + window.scrollY), height: Math.round(r.height) };
  });
});
console.log(JSON.stringify(sections, null, 2));
await browser.close();
