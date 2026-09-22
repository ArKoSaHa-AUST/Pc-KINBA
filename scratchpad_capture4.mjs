import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

const reqs = [];
page.on('response', (res) => {
  if (res.url().includes('/api/')) {
    reqs.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  }
});
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));

await page.goto(BASE + '/product/7ff7d19a-1411-4899-b1b5-cb20330a01a9', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log(reqs.join('\n'));
await browser.close();
