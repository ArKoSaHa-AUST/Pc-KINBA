import { chromium } from 'playwright';
const OUT = 'C:/Users/Dhrubo/AppData/Local/Temp/claude/e--Pc-KINBA/4ca7fac7-2e86-40ba-a773-c1f1f10270bd/scratchpad/shots';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE + '/product/0712eabf-38ef-4c60-84f5-0585bdb9f54a', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/product-fixed-full.png`, fullPage: true });
console.log('errors:', errors);
const height = await page.evaluate(() => document.body.scrollHeight);
console.log('page height:', height);

await browser.close();
