import { chromium } from 'playwright';
const OUT = 'C:/Users/Dhrubo/AppData/Local/Temp/claude/e--Pc-KINBA/4ca7fac7-2e86-40ba-a773-c1f1f10270bd/scratchpad/shots';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

await page.goto(BASE + '/components', { waitUntil: 'networkidle' });
await page.waitForSelector('a[href^="/product/"]', { timeout: 8000 });
const hrefs = await page.$$eval('a[href^="/product/"]', (as) => as.slice(0, 8).map(a => a.getAttribute('href')));
console.log('hrefs:', hrefs);

// pick the 3rd distinct one (skip first couple which may be generic/placeholder)
for (let i = 0; i < Math.min(3, hrefs.length); i++) {
  await page.goto(BASE + hrefs[i], { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/product-alt-${i}-full.png`, fullPage: true });
  const title = await page.locator('h1').first().textContent().catch(() => 'N/A');
  console.log(`product ${i}: ${hrefs[i]} -> title: ${title}`);
}
await browser.close();
