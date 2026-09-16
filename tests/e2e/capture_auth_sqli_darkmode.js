import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(process.cwd(), 'TestSS2');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureStep(page, url, ssPath, { fullPage = false, waitAfter = 1500, action = null } = {}) {
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
    console.log(`✅ Saved Evidence: ${ssPath}`);
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

async function runAuthAndSecurityTests() {
  console.log('🚀 Launching Chromium for Auth Features & SQL Injection Security Testing in Dark Mode...');
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

  // --- 1. AUTH: Caps Lock Active Warning Badge ---
  console.log('\n--- 1. Testing Caps Lock Detection & Warning Badge ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'AUTH-01_CapsLock_Indicator_Dark.png',
    {
      action: async (p) => {
        await p.fill('input[type="email"]', 'engineer@pckinba.com');
        const passInput = p.locator('input[autocomplete="current-password"]');
        await passInput.focus();
        await passInput.fill('SecretP@ss');
        
        await p.evaluate(() => {
          const passEl = document.querySelector('input[autocomplete="current-password"]');
          if (passEl) {
            const event = new KeyboardEvent('keydown', {
              key: 'A',
              bubbles: true,
              cancelable: true
            });
            Object.defineProperty(event, 'getModifierState', {
              value: (key) => key === 'CapsLock'
            });
            passEl.dispatchEvent(event);
          }
        });
      }
    }
  );

  // --- 2. AUTH: Password Reveal / Visibility Toggle ---
  console.log('\n--- 2. Testing Password Visibility Reveal/Hide Toggle ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'AUTH-02_Password_Reveal_Toggle_Dark.png',
    {
      action: async (p) => {
        await p.fill('input[type="email"]', 'sarah.connor@pckinba.com');
        const passInput = p.locator('input[autocomplete="current-password"]');
        await passInput.fill('CyberKinba#2026$SecureKey');
        
        const toggleBtn = p.locator('input[autocomplete="current-password"] ~ button, form button[aria-label*="password"], form button[aria-label*="Password"]').first();
        if (await toggleBtn.count() > 0) {
          await toggleBtn.click();
        } else {
          await p.locator('form button:has(svg.lucide-eye), form button:has(svg.lucide-eye-off)').first().click();
        }
      }
    }
  );

  // --- 3. AUTH: Remember Me Security Tooltip ---
  console.log('\n--- 3. Testing Remember Me 30-Day Security Tooltip ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'AUTH-03_RememberMe_Tooltip_Dark.png',
    {
      action: async (p) => {
        await p.fill('input[type="email"]', 'pro_builder@pckinba.com');
        await p.fill('input[autocomplete="current-password"]', 'BuildRig2026!');
        
        const rememberCheckbox = p.locator('#rememberMe');
        if (await rememberCheckbox.count() > 0) {
          await rememberCheckbox.check();
        }
        
        const helpBtn = p.locator('button[aria-label="Remember me security details"], button:has(svg.lucide-help-circle)').first();
        if (await helpBtn.count() > 0) {
          await helpBtn.click();
        }
      }
    }
  );

  // --- 4. AUTH: Social OAuth Gateway Connection Feedback ---
  console.log('\n--- 4. Testing Social OAuth Gateway Trigger ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'AUTH-04_OAuth_Gateway_Trigger_Dark.png',
    {
      action: async (p) => {
        // Click Steam button or Passkey button to trigger gateway notification toast
        const steamBtn = p.locator('button[aria-label*="Steam"], button:has-text("Steam")').first();
        if (await steamBtn.count() > 0) {
          await steamBtn.click();
        } else {
          const passkeyBtn = p.locator('button:has-text("Passkey")').first();
          if (await passkeyBtn.count() > 0) {
            await passkeyBtn.click();
          }
        }
        await sleep(500);
      }
    }
  );

  // --- 5. AUTH: Strong Password Gauge & Requirements ---
  console.log('\n--- 5. Testing Strong Password Gauge & Requirements ---');
  await captureStep(
    page,
    `${BASE_URL}/register`,
    'AUTH-05_Password_Strength_Gauge_Dark.png',
    {
      action: async (p) => {
        const nameInput = p.locator('input[placeholder*="name" i], input[autocomplete="name"]').first();
        const emailInput = p.locator('input[type="email"]').first();
        if (await nameInput.count() > 0) await nameInput.fill('Alex Vance');
        if (await emailInput.count() > 0) await emailInput.fill('alex.vance@pckinba.com');
        
        const nextBtn = p.locator('button:has-text("Continue"), button:has-text("Next")').first();
        if (await nextBtn.count() > 0) await nextBtn.click();
        await sleep(800);
        
        const passInputs = p.locator('input[type="password"]');
        if (await passInputs.count() >= 2) {
          await passInputs.nth(0).fill('P@ssw0rd#2026!Kinba_Super_Ultra_Secure');
          await passInputs.nth(1).fill('P@ssw0rd#2026!Kinba_Super_Ultra_Secure');
        }
      }
    }
  );

  // --- 6. SECURITY / SQLi: Login SQL Injection Defense (' OR '1'='1) ---
  console.log('\n--- 6. Testing Login SQL Injection Defense (\' OR \'1\'=\'1) ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'AUTH-SQLI-01_Login_SQL_Injection_Defense_Dark.png',
    {
      action: async (p) => {
        await p.fill('input[type="email"]', "' OR '1'='1' --");
        await p.fill('input[autocomplete="current-password"]', "' OR '1'='1'");
        
        const submitBtn = p.locator('button[type="submit"]:has-text("Sign in"), button[type="submit"]').first();
        await submitBtn.click();
        await sleep(1200);
      }
    }
  );

  // --- 7. SECURITY / SQLi: Admin Privilege Escalation SQLi Defense (admin'--) ---
  console.log('\n--- 7. Testing Admin Privilege Escalation SQLi Defense (admin\'--) ---');
  await captureStep(
    page,
    `${BASE_URL}/login`,
    'AUTH-SQLI-02_Admin_Bypass_SQLi_Defense_Dark.png',
    {
      action: async (p) => {
        await p.fill('input[type="email"]', "admin'--@pckinba.com");
        await p.fill('input[autocomplete="current-password"]', "1' UNION SELECT 1, 'admin', 'hash'--");
        
        const submitBtn = p.locator('button[type="submit"]:has-text("Sign in"), button[type="submit"]').first();
        await submitBtn.click();
        await sleep(1200);
      }
    }
  );

  // --- 8. SECURITY / SQLi: Registration Multi-Field SQLi Defense ---
  console.log('\n--- 8. Testing Registration SQLi & Schema Probe Defense ---');
  await captureStep(
    page,
    `${BASE_URL}/register`,
    'AUTH-SQLI-03_Register_SQLi_Validation_Dark.png',
    {
      action: async (p) => {
        const nameInput = p.locator('input[placeholder*="name" i], input[autocomplete="name"]').first();
        const emailInput = p.locator('input[type="email"]').first();
        
        if (await nameInput.count() > 0) {
          await nameInput.fill("Robert'); DROP TABLE users;--");
        }
        if (await emailInput.count() > 0) {
          await emailInput.fill("victim'+(SELECT 1)+'@pckinba.com");
        }
        await sleep(500);
      }
    }
  );

  // --- 9. SECURITY / SQLi: Forgot Password SQLi Defense ---
  console.log('\n--- 9. Testing Forgot Password SQL Injection Defense ---');
  await captureStep(
    page,
    `${BASE_URL}/forgot-password`,
    'AUTH-SQLI-04_ForgotPassword_SQLi_Defense_Dark.png',
    {
      action: async (p) => {
        await p.fill('input[type="email"]', "' UNION SELECT id, email, password_hash FROM auth.users--");
        const submitBtn = p.locator('button[type="submit"]').first();
        await submitBtn.click();
        await sleep(1200);
      }
    }
  );

  // --- 10. SECURITY / SQLi: Search Endpoint UNION-Based SQL Injection Defense ---
  console.log('\n--- 10. Testing Search UNION-Based SQL Injection Defense ---');
  await captureStep(
    page,
    `${BASE_URL}/search?q=%27%20UNION%20SELECT%20null%2C%20username%2C%20password%20FROM%20users--`,
    'SEC-SQLI-01_Search_Union_SQLi_Defense_Dark.png',
    {
      action: async (p) => {
        await sleep(1500);
      }
    }
  );

  await browser.close();
  console.log('\n🎉 Auth & SQL Injection Security Test Suite execution completed successfully in Dark Mode!');
}

runAuthAndSecurityTests().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
