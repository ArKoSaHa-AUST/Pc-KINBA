import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark'
  });
  const page = await context.newPage();
  
  // Set theme in localStorage before navigating
  await page.addInitScript(() => {
    localStorage.setItem('pckinba.theme', 'dark');
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  
  fs.mkdirSync('TestSS2', { recursive: true });
  await page.screenshot({ path: 'TestSS2/01_Home_Page_Dark.png', fullPage: true });
  console.log('Captured 01_Home_Page_Dark.png');

  await browser.close();
}

test().catch(console.error);
