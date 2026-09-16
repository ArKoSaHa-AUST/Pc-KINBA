import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(process.cwd(), 'TestSS2');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureStep(page, url, ssPath, { fullPage = false, waitAfter = 1800, action = null } = {}) {
  try {
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }
    await sleep(waitAfter);
    if (action) {
      await action(page);
      await sleep(1000);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, ssPath), fullPage });
    console.log(`✅ Saved Exception Evidence: ${ssPath}`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Warning on ${ssPath}:`, err.message);
    try {
      await page.screenshot({ path: path.join(OUTPUT_DIR, ssPath), fullPage: false });
      console.log(`📸 Captured fallback for ${ssPath}`);
    } catch {}
    return false;
  }
}

async function runExceptionTests() {
  console.log('🚀 Running Playwright Exception & Error-Handling Test Suite in Dark Mode...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    deviceScaleFactor: 1.25
  });

  await context.addInitScript(() => {
    localStorage.setItem('pckinba.theme', 'dark');
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  const page = await context.newPage();

  console.log('\n--- 1. Testing Hardware Incompatibility Exception (LGA1700 CPU on AM5 Motherboard) ---');
  await captureStep(
    page,
    `${BASE_URL}/pc-builder?parts=cpu-i7-14700k,mobo-b650m-a`,
    'EX-01_Incompatible_Socket_Warning_Dark.png',
    {
      fullPage: false,
      waitAfter: 2000,
      action: async (p) => {
        await p.evaluate(() => {
          const el = document.querySelector('.builder-summary-section, .build-summary, .compat-badge, .checkout-checklist');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
          else window.scrollTo(0, 1000);
        });
        await sleep(800);
      }
    }
  );

  console.log('\n--- 2. Testing Insufficient PSU Wattage Deficit Exception (RTX 4090 on 650W PSU) ---');
  await captureStep(
    page,
    `${BASE_URL}/pc-builder?parts=cpu-i7-14700k,gpu-rtx4090,psu-cx650`,
    'EX-02_Insufficient_PSU_Wattage_Dark.png',
    {
      fullPage: false,
      waitAfter: 2000,
      action: async (p) => {
        await p.evaluate(() => {
          const el = document.querySelector('.builder-summary-section, .build-summary, .compat-badge');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
          else window.scrollTo(0, 1000);
        });
        await sleep(800);
      }
    }
  );

  console.log('\n--- 3. Testing Search No Results Empty State Exception ---');
  await captureStep(
    page,
    `${BASE_URL}/search?q=xyznonexistenthardware99999`,
    'EX-03_Search_No_Results_Found_Dark.png',
    { fullPage: false, waitAfter: 2000 }
  );

  console.log('\n--- 4. Testing Special Character & XSS Sanitization Exception ---');
  await captureStep(
    page,
    `${BASE_URL}/search?q=%3Cscript%3Ealert(%22XSS%22)%3C%2Fscript%3E`,
    'EX-04_Search_Special_Char_Injection_Dark.png',
    { fullPage: false, waitAfter: 2000 }
  );

  console.log('\n--- 5. Testing Auth Invalid Email / Form Submission Exception ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'EX-05_Auth_Invalid_Credentials_Error_Dark.png',
    {
      fullPage: false,
      waitAfter: 1500,
      action: async (p) => {
        const emailInput = await p.$('input[type="email"]');
        const pwdInput = await p.$('input[type="password"]');
        if (emailInput) await emailInput.fill('invalid-email-no-at-sign');
        if (pwdInput) await pwdInput.fill('short');
        const submitBtn = await p.$('button[type="submit"], button:has-text("Sign in"), button:has-text("লগইন"), button:has-text("সাইন ইন")');
        if (submitBtn) {
          await submitBtn.click();
          await sleep(800);
        }
      }
    }
  );

  console.log('\n--- 6. Testing Registration Weak Password Validation Exception ---');
  await captureStep(
    page,
    `${BASE_URL}/register`,
    'EX-06_Auth_Weak_Password_Validation_Dark.png',
    {
      fullPage: false,
      waitAfter: 1500,
      action: async (p) => {
        const pwdInput = await p.$('input[type="password"]');
        if (pwdInput) {
          await pwdInput.fill('123');
          await sleep(800);
        }
      }
    }
  );

  console.log('\n--- 7. Testing Invalid Product 404 Exception Handling ---');
  await captureStep(
    page,
    `${BASE_URL}/product/invalid-uuid-0000-nonexistent`,
    'EX-07_Invalid_Product_UUID_Dark.png',
    { fullPage: false, waitAfter: 2000 }
  );

  console.log('\n--- 8. Testing Empty Build Quotation Attempt ---');
  await captureStep(
    page,
    `${BASE_URL}/pc-builder/quote`,
    'EX-08_Empty_Rig_Quote_Redirect_Dark.png',
    { fullPage: false, waitAfter: 2000 }
  );

  await context.close();
  await browser.close();

  console.log('🎉 Exception & Error testing suite completed successfully!');
}

runExceptionTests().catch(err => {
  console.error('❌ Exception suite error:', err);
  process.exit(1);
});
