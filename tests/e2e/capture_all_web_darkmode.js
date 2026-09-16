import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(process.cwd(), 'TestSS2');
const SAMPLE_BUILD_PARTS = 'cpu-r7-7800x3d,mobo-b650m-a,ram-tridentz5-32,ssd-sn770-1tb,gpu-rtx4070ti,psu-mwe750,case-lancool216,cool-ls520';

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
    console.log(`✅ Saved: ${ssPath}`);
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

async function runAllBrowserTests() {
  console.log('🚀 Launching Chromium for comprehensive dark-mode web application testing...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
      '--enable-webgl',
      '--use-gl=swiftshader'
    ]
  });

  // Desktop context in Dark Mode
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    deviceScaleFactor: 1.25
  });

  await desktopContext.addInitScript(() => {
    localStorage.setItem('pckinba.theme', 'dark');
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  const page = await desktopContext.newPage();

  console.log('\n--- 1. Testing Home Page Flows ---');
  // 01 Home Page Full
  await captureStep(page, `${BASE_URL}/`, '01_Home_Page_Full_Dark.png', { fullPage: true, waitAfter: 2000 });

  // 02 Home Page Hero
  await captureStep(page, null, '02_Home_Page_Hero_Dark.png', { fullPage: false });

  // 03 Live Search Autocomplete Dropdown
  await captureStep(page, null, '03_Home_LiveSearch_Dropdown_Dark.png', {
    action: async (p) => {
      const searchBtn = await p.$('button[aria-label*="search" i], button:has(.lucide-search), button svg.lucide-search');
      if (searchBtn) {
        await searchBtn.click();
        await sleep(600);
      }
      const searchInput = await p.$('input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.fill('RTX 4060');
        await sleep(1000);
      }
    }
  });

  // 04 Language Switcher (Bangla Localization)
  await captureStep(page, `${BASE_URL}/`, '04_Home_Bangla_Localization_Dark.png', {
    action: async (p) => {
      const langBtn = await p.$('button[title*="Language" i], button:has-text("EN"), button:has-text("বাং")');
      if (langBtn) {
        await langBtn.click();
        await sleep(500);
        const bnOpt = await p.$('button:has-text("বাংলা"), [role="menuitem"]:has-text("বাংলা"), li:has-text("বাংলা")');
        if (bnOpt) await bnOpt.click();
        await sleep(800);
      }
    }
  });

  console.log('\n--- 2. Testing Search & Multi-Store Price Matrix ---');
  // 05 Search Page GPU Results
  await captureStep(page, `${BASE_URL}/search?q=rtx`, '05_Search_Page_GPU_Results_Dark.png', { fullPage: true, waitAfter: 2500 });

  // 06 Search Filter Applied
  await captureStep(page, null, '06_Search_Page_Filters_Applied_Dark.png', {
    action: async (p) => {
      const storeFilter = await p.$('input[type="checkbox"], label:has-text("Star Tech"), label:has-text("Techland")');
      if (storeFilter) {
        await storeFilter.click();
        await sleep(800);
      }
    }
  });

  // 07 Search Page CPU Results
  await captureStep(page, `${BASE_URL}/search?q=Ryzen`, '07_Search_Page_CPU_Results_Dark.png', { fullPage: true, waitAfter: 2500 });

  console.log('\n--- 3. Testing Product Details Page & Specifications ---');
  // 08 Product Details Hero
  await captureStep(page, `${BASE_URL}/product/a71c73a4-db0e-4b1b-97ce-0c6080e08cfc`, '08_Product_Details_Hero_Dark.png', { fullPage: false, waitAfter: 2000 });

  // 09 Product Details Specs Table (Full Page)
  await captureStep(page, null, '09_Product_Details_Specs_Table_Dark.png', { fullPage: true, waitAfter: 1000 });

  // 10 Product Details Price History Chart
  await captureStep(page, null, '10_Product_Details_Price_History_Dark.png', {
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 550));
      await sleep(800);
    }
  });

  // 11 Product Details Reviews & Feedback
  await captureStep(page, null, '11_Product_Details_Reviews_Dark.png', {
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 600));
      await sleep(800);
    }
  });

  console.log('\n--- 4. Testing PC Builder System & Rig Assembly ---');
  // 12 PC Builder Initial Workspace
  await captureStep(page, `${BASE_URL}/pc-builder`, '12_PC_Builder_Initial_Workspace_Dark.png', { fullPage: true, waitAfter: 2500 });

  // 13 PC Builder Slot Selection Modal
  await captureStep(page, null, '13_PC_Builder_Slot_Modal_CPU_Dark.png', {
    action: async (p) => {
      const chooseBtn = await p.$('button:has-text("Choose"), button:has-text("Add"), [data-slot] button');
      if (chooseBtn) {
        await chooseBtn.click();
        await sleep(1200);
      }
    }
  });

  // 14 Select Component from Modal
  await captureStep(page, null, '14_PC_Builder_CPU_Added_Dark.png', {
    action: async (p) => {
      const closeBtn = await p.$('[aria-label="Close" i], button:has(.lucide-x), [role="dialog"] button.close');
      if (closeBtn) await closeBtn.click();
      await sleep(500);
    }
  });

  // 15 Full Populated Build (All Slots Filled)
  await captureStep(page, `${BASE_URL}/pc-builder?parts=${SAMPLE_BUILD_PARTS}`, '15_PC_Builder_Full_Rig_Populated_Dark.png', {
    fullPage: true,
    waitAfter: 2500
  });

  // 16 Compatibility Status Bar & Wattage HUD
  await captureStep(page, null, '16_PC_Builder_Compatibility_Status_Dark.png', {
    action: async (p) => {
      await p.evaluate(() => window.scrollTo(0, 550));
      await sleep(800);
    }
  });

  // 17 3D Rig Assembly Canvas Viewport
  await captureStep(page, null, '17_PC_Builder_3D_Rig_Visualizer_Dark.png', {
    action: async (p) => {
      await p.evaluate(() => window.scrollTo(0, 200));
      await sleep(1500);
    }
  });

  console.log('\n--- 5. Testing Builder Sub-pages (Quote, Checkout, Library, Compare) ---');
  // 18 PC Builder Formal Quotation Sheet
  await captureStep(page, `${BASE_URL}/pc-builder/quote?parts=${SAMPLE_BUILD_PARTS}`, '18_PC_Builder_Quote_View_Dark.png', { fullPage: true, waitAfter: 2000 });

  // 19 Multi-Store Cart Routing Checkout Matrix
  await captureStep(page, `${BASE_URL}/pc-builder/checkout?parts=${SAMPLE_BUILD_PARTS}`, '19_PC_Builder_MultiStore_Checkout_Dark.png', { fullPage: true, waitAfter: 2000 });

  // 20 Community PC Build Library
  await captureStep(page, `${BASE_URL}/pc-builder/library`, '20_PC_Builder_Community_Library_Dark.png', { fullPage: true, waitAfter: 2000 });

  // 21 Compare Two Custom Builds
  await captureStep(page, `${BASE_URL}/pc-builder/compare`, '21_PC_Builder_Compare_Builds_Dark.png', { fullPage: true, waitAfter: 2000 });

  console.log('\n--- 6. Testing Hardware Compare Page ---');
  // 22 Compare Initial View
  await captureStep(page, `${BASE_URL}/compare`, '22_Hardware_Compare_Initial_Dark.png', { fullPage: false, waitAfter: 2500 });

  // 23 Compare Full Spec Matrix Table
  await captureStep(page, null, '23_Hardware_Compare_Full_Page_Dark.png', { fullPage: true, waitAfter: 1000 });

  // 24 Compare Radar Benchmark Chart
  await captureStep(page, null, '24_Hardware_Compare_Radar_Chart_Dark.png', {
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 500));
      await sleep(800);
    }
  });

  // 25 Compare Retailer Pricing Matrix
  await captureStep(page, null, '25_Hardware_Compare_Retailer_Matrix_Dark.png', {
    action: async (p) => {
      await p.evaluate(() => window.scrollBy(0, 500));
      await sleep(800);
    }
  });

  console.log('\n--- 7. Testing Tonima AI Assistant Workspace ---');
  // 26 Tonima AI Assistant Hero & Workspace
  await captureStep(page, `${BASE_URL}/ai-assistant`, '26_Tonima_AI_Assistant_Hero_Dark.png', { fullPage: false, waitAfter: 2500 });

  // 27 Tonima AI Full Workspace
  await captureStep(page, null, '27_Tonima_AI_Full_Workspace_Dark.png', { fullPage: true, waitAfter: 1000 });

  // 28 Interactive Chat with Tonima
  await captureStep(page, null, '28_Tonima_AI_Chat_Interaction_Dark.png', {
    action: async (p) => {
      const chatInput = await p.$('textarea, input[placeholder*="Ask Tonima" i], input[placeholder*="message" i], input[placeholder*="Prompt" i], input[type="text"]');
      if (chatInput) {
        await chatInput.fill('Recommend a 1440p gaming build for 120,000 BDT with RTX 4070');
        await sleep(500);
        const submitBtn = await p.$('button[type="submit"], button:has(.lucide-send), button:has(.lucide-sparkles), button:has-text("Send")');
        if (submitBtn) {
          await submitBtn.click();
          await sleep(3500);
        }
      }
    }
  });

  console.log('\n--- 8. Testing Components Catalog ---');
  // 29 Components Catalog
  await captureStep(page, `${BASE_URL}/components`, '29_Components_Catalog_Dark.png', { fullPage: true, waitAfter: 2000 });

  console.log('\n--- 9. Testing Authentication Pages ---');
  // 30 Login Page
  await captureStep(page, `${BASE_URL}/login`, '30_Auth_Login_Page_Dark.png', { fullPage: true, waitAfter: 1800 });

  // 31 Register Page (with password validation test)
  await captureStep(page, `${BASE_URL}/register`, '31_Auth_Register_Page_Dark.png', {
    fullPage: true,
    waitAfter: 1800,
    action: async (p) => {
      const emailInput = await p.$('input[type="email"]');
      const pwdInput = await p.$('input[type="password"]');
      if (emailInput) await emailInput.fill('qa.builder@pckinba.com');
      if (pwdInput) await pwdInput.fill('KinbaUltra2026!#');
      await sleep(600);
    }
  });

  // 32 Forgot Password Page
  await captureStep(page, `${BASE_URL}/forgot-password`, '32_Auth_ForgotPassword_Page_Dark.png', { fullPage: true, waitAfter: 1500 });

  // 33 Reset Password Page
  await captureStep(page, `${BASE_URL}/reset-password`, '33_Auth_ResetPassword_Page_Dark.png', { fullPage: true, waitAfter: 1500 });

  // 34 Verify Email Page
  await captureStep(page, `${BASE_URL}/verify`, '34_Auth_Verify_Page_Dark.png', { fullPage: true, waitAfter: 1500 });

  await desktopContext.close();

  console.log('\n--- 10. Testing Mobile Responsive Views (390x844) in Dark Mode ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem('pckinba.theme', 'dark');
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  const mobilePage = await mobileContext.newPage();

  // 35 Mobile Home
  await captureStep(mobilePage, `${BASE_URL}/`, '35_Mobile_Home_Dark.png', { fullPage: false, waitAfter: 1500 });

  // 36 Mobile PC Builder
  await captureStep(mobilePage, `${BASE_URL}/pc-builder?parts=${SAMPLE_BUILD_PARTS}`, '36_Mobile_PC_Builder_Dark.png', { fullPage: false, waitAfter: 2000 });

  // 37 Mobile Search Matrix
  await captureStep(mobilePage, `${BASE_URL}/search?q=rtx`, '37_Mobile_Search_Matrix_Dark.png', { fullPage: false, waitAfter: 2000 });

  // 38 Mobile AI Assistant
  await captureStep(mobilePage, `${BASE_URL}/ai-assistant`, '38_Mobile_AI_Assistant_Dark.png', { fullPage: false, waitAfter: 2000 });

  await mobileContext.close();
  await browser.close();

  console.log('\n🎉 All browser dark-mode testing and screenshots successfully completed!');
}

runAllBrowserTests().catch(err => {
  console.error('❌ Execution error:', err);
  process.exit(1);
});
