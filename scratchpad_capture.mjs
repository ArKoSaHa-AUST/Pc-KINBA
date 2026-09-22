import { chromium } from 'playwright';

const OUT = 'C:/Users/Dhrubo/AppData/Local/Temp/claude/e--Pc-KINBA/4ca7fac7-2e86-40ba-a773-c1f1f10270bd/scratchpad/shots';
const BASE = 'http://localhost:5173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

async function shoot(url, name, opts = {}) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (opts.waitFor) {
    try {
      await page.waitForSelector(opts.waitFor, { timeout: 8000 });
    } catch {
      console.log(`[warn] selector not found for ${name}: ${opts.waitFor}`);
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${name}-viewport.png`, fullPage: false });
  console.log(`captured ${name}`);
}

await shoot('/', 'home');
await shoot('/components', 'components', { waitFor: '[data-testid], .product-card, a[href^="/product/"]' });

// Find a product link from the components page to visit a real product detail page
const productHref = await page.evaluate(() => {
  const a = document.querySelector('a[href^="/product/"]');
  return a ? a.getAttribute('href') : null;
});
console.log('productHref:', productHref);

if (productHref) {
  await shoot(productHref, 'product-details');
} else {
  console.log('[warn] no product link found on components page');
}

console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 20)));

await browser.close();
