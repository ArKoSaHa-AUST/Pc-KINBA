import { chromium } from 'playwright';
const OUT = 'C:/Users/Dhrubo/AppData/Local/Temp/claude/e--Pc-KINBA/4ca7fac7-2e86-40ba-a773-c1f1f10270bd/scratchpad/shots';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Scroll through the whole page in small steps to trigger any whileInView / IntersectionObserver animations
const height = await page.evaluate(() => document.body.scrollHeight);
console.log('page height before scroll:', height);
let y = 0;
while (y < height) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(250);
  y += 400;
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const heightAfter = await page.evaluate(() => document.body.scrollHeight);
console.log('page height after scroll:', heightAfter);

await page.screenshot({ path: `${OUT}/home-scrolled-full.png`, fullPage: true });
console.log('captured home-scrolled');
await browser.close();
