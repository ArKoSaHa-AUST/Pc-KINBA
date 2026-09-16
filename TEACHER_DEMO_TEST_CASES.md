# PC Kinba — Live Teacher Demonstration & Manual Testing Guide

This guide is designed as an interactive, step-by-step manual testing script for **PC Kinba**. If your teacher or evaluator asks you to demonstrate any feature live on screen, find the corresponding section below, follow the exact steps, enter the sample inputs, and explain the expected result and technical implementation.

All test cases are verified in **Dark Mode** on `http://localhost:5173`.

---

## 📋 Quick Demonstration Index

1. [Authentication & Security Suite (Sign In / Login)](#1-authentication-sign-in--login)
2. [Registration & Password Entropy Suite (Sign Up / Register)](#2-registration-sign-up--register)
3. [Password Recovery Suite (Forgot Password)](#3-password-recovery-forgot-password)
4. [Home & Spatial Exploration Suite (Landing Page)](#4-home-landing-page)
5. [Live Search & Multi-Retailer Price Comparison Matrix](#5-live-search--multi-retailer-price-matrix)
6. [Product Details, Price History & Spec Breakdown](#6-product-details-specs--price-trend)
7. [Custom PC Builder & Compatibility Engine](#7-custom-pc-builder--compatibility-engine)
8. [Offline Quotation Sheet (A4 PDF Export)](#8-offline-quotation-sheet-quote-export)
9. [Smart Multi-Store Cart Optimization & Routing](#9-smart-multi-store-cart-optimization)
10. [Hardware Compare Battleground & 6-Axis Radar Chart](#10-hardware-compare-battleground--radar-chart)
11. [Tonima AI Conversational Hardware Architect](#11-tonima-ai-conversational-architect)
12. [Cyber Security & Defensive SQL/XSS Injection Suite](#12-cyber-security--defensive-sqli--xss-suite)

---

## 1. Authentication (Sign In / Login)
**URL**: `http://localhost:5173/login`

### 🔹 Test Case 1.1: Standard Successful Login
* **Goal**: Demonstrate user authentication with valid credentials.
* **Pre-conditions**: App is running, navigate to `/login`.
* **Step-by-Step Actions**:
  1. In the **Email** field, enter: `demo@pckinba.com` (or registered email).
  2. In the **Password** field, enter: `Password123!`
  3. Click the **Sign in** button.
* **Expected Result**: 
  - Green success notification: *"Welcome back!"*
  - Automatically redirects to the `/profile` or previously requested page.
* **Evidence Reference**: [`TestSS2/30_Auth_Login_Page_Dark.png`](TestSS2/30_Auth_Login_Page_Dark.png)

---

### 🔹 Test Case 1.2: Invalid Credentials & Form Shake
* **Goal**: Verify defensive handling and UX animation on wrong password.
* **Step-by-Step Actions**:
  1. Enter Email: `user@example.com`
  2. Enter Password: `WrongPassword999!`
  3. Click **Sign in**.
* **Expected Result**: 
  - The login card performs a physical **shake animation**.
  - Red danger toast appears at top right: `❌ Invalid login credentials`.
  - Input values remain preserved without page reload.
* **Evidence Reference**: [`TestSS2/EX-05_Auth_Invalid_Credentials_Error_Dark.png`](TestSS2/EX-05_Auth_Invalid_Credentials_Error_Dark.png)

---

### 🔹 Test Case 1.3: Caps Lock Live Warning Indicator
* **Goal**: Prove real-time hardware key detection prevents accidental wrong password attempts.
* **Step-by-Step Actions**:
  1. Click inside the **Password** input field.
  2. Press the **Caps Lock** key on your physical keyboard.
  3. Type any character.
* **Expected Result**: 
  - An animated amber warning badge immediately appears under the password input:
    `⚠ Caps Lock is ON ⇪`
  - Disabling Caps Lock immediately hides the warning badge.
* **Evidence Reference**: [`TestSS2/AUTH-01_CapsLock_Indicator_Dark.png`](TestSS2/AUTH-01_CapsLock_Indicator_Dark.png)

---

### 🔹 Test Case 1.4: Password Visibility Reveal/Hide Toggle
* **Goal**: Allow users to verify complex typed passwords in plain text.
* **Step-by-Step Actions**:
  1. Type in Password: `CyberKinba#2026$SecureKey` (masked as dots `••••••••••••`).
  2. Click the **Eye icon** on the right side of the password field.
* **Expected Result**: 
  - Field type changes from `password` to `text`.
  - Password text is visibly displayed as `CyberKinba#2026$SecureKey`.
  - Eye icon toggles to `EyeOff` (`slash-through eye`).
  - Clicking again re-masks the password.
* **Evidence Reference**: [`TestSS2/AUTH-02_Password_Reveal_Toggle_Dark.png`](TestSS2/AUTH-02_Password_Reveal_Toggle_Dark.png)

---

### 🔹 Test Case 1.5: Remember Me Session Security Tooltip
* **Goal**: Show security transparency regarding cookie and session token lifespan.
* **Step-by-Step Actions**:
  1. Check the checkbox **"Keep me signed in on this device"**.
  2. Hover or click the small **Help/Question mark icon `(?)`** beside it.
* **Expected Result**: 
  - A glassmorphic dark tooltip pops up stating:
    *"Your session will stay active for 30 days on trusted devices."*
* **Evidence Reference**: [`TestSS2/AUTH-03_RememberMe_Tooltip_Dark.png`](TestSS2/AUTH-03_RememberMe_Tooltip_Dark.png)

---

### 🔹 Test Case 1.6: Social OAuth Gateway Connection
* **Goal**: Demonstrate third-party federated login triggers.
* **Step-by-Step Actions**:
  1. Click on the **Steam** or **Passkey / WebAuthn** button in the social group.
* **Expected Result**: 
  - Blue notification toast triggers: *"Connecting to Steam authentication gateway..."*
* **Evidence Reference**: [`TestSS2/AUTH-04_OAuth_Gateway_Trigger_Dark.png`](TestSS2/AUTH-04_OAuth_Gateway_Trigger_Dark.png)

---

## 2. Registration (Sign Up / Register)
**URL**: `http://localhost:5173/register`

### 🔹 Test Case 2.1: Multi-Step Registration Wizard (Step 1: Account Identity)
* **Goal**: Demonstrate 3-step structured onboarding.
* **Step-by-Step Actions**:
  1. Navigate to `/register`.
  2. In **Full Name**, enter: `Tanvir Ahmed`
  3. In **Email**, enter: `tanvir.gamer@gmail.com`
  4. Click **Continue to Security →**.
* **Expected Result**: 
  - Wizard seamlessly advances to **Step 2: Security & Password** with active step badge `(2)`.
* **Evidence Reference**: [`TestSS2/31_Auth_Register_Page_Dark.png`](TestSS2/31_Auth_Register_Page_Dark.png)

---

### 🔹 Test Case 2.2: Real-Time Password Entropy Gauge & Rule Verification
* **Goal**: Demonstrate client-side zxcvbn/custom entropy scoring and rule checklist.
* **Step-by-Step Actions**:
  1. On Step 2, enter a weak password: `123`
     - *Observe*: Red gauge with label *"Weak"*, next button disabled.
  2. Change password to: `P@ssw0rd#2026!Kinba_Super_Ultra_Secure`
  3. In **Confirm Password**, type the identical password.
* **Expected Result**: 
  - Strength meter fills 100% with a neon green bar labeled **"Quantum Cyber"** (or "Strong").
  - All 4 checklist requirements turn green with checkmarks:
    - `✔ At least 8 characters`
    - `✔ Uppercase letter (A-Z)`
    - `✔ At least one number (0-9)`
    - `✔ Special symbol (!@#$)`
  - Feedback note displays: `✔ Passwords match perfectly!`
* **Evidence Reference**: [`TestSS2/AUTH-05_Password_Strength_Gauge_Dark.png`](TestSS2/AUTH-05_Password_Strength_Gauge_Dark.png)

---

### 🔹 Test Case 2.3: Build Purpose Selection & Terms Acceptance (Step 3)
* **Goal**: Demonstrate user profile personalization upon account creation.
* **Step-by-Step Actions**:
  1. Click **Configure Rig Profile →** to move to Step 3.
  2. Select Primary Rig Purpose: Choose **"High-End Gaming & Streaming"** (or "AI & Deep Learning").
  3. Check **"I agree to the Terms of Service & Privacy Policy"**.
  4. Click **Complete Registration**.
* **Expected Result**: 
  - Profile is created, user is logged in, and redirected to custom profile dashboard.

---

## 3. Password Recovery (Forgot Password)
**URL**: `http://localhost:5173/forgot-password`

### 🔹 Test Case 3.1: Password Reset Link Request
* **Goal**: Verify secure password reset email flow.
* **Step-by-Step Actions**:
  1. Navigate to `/forgot-password`.
  2. In Email, enter: `tanvir.gamer@gmail.com`
  3. Click **Send reset link**.
* **Expected Result**: 
  - Success message / toast appears: *"If that email is registered, a reset link is on its way."*
  - Button state disables to prevent spamming.
* **Evidence Reference**: [`TestSS2/32_Auth_ForgotPassword_Page_Dark.png`](TestSS2/32_Auth_ForgotPassword_Page_Dark.png)

---

## 4. Home (Landing Page)
**URL**: `http://localhost:5173/`

### 🔹 Test Case 4.1: Live Global Search Autocomplete Dropdown
* **Goal**: Demonstrate instant fuzzy searching from the hero section.
* **Step-by-Step Actions**:
  1. Open `/` in Dark Mode.
  2. Click the central hero search input.
  3. Type: `RTX 40`
* **Expected Result**: 
  - Floating dropdown immediately opens displaying matched hardware (e.g. *ASUS ROG Strix RTX 4090, MSI RTX 4070 Ti, PNY RTX 4060*).
  - Shows price, retailer source, and category badge.
* **Evidence Reference**: [`TestSS2/03_Home_LiveSearch_Dropdown_Dark.png`](TestSS2/03_Home_LiveSearch_Dropdown_Dark.png)

---

### 🔹 Test Case 4.2: Full Bangla (বাংলা) Localization Switch
* **Goal**: Show regional accessibility for Bangladeshi hardware buyers.
* **Step-by-Step Actions**:
  1. On the top navigation bar, click the **Language Switcher (`🌐 EN / বাংলা`)**.
  2. Select **বাংলা**.
* **Expected Result**: 
  - Hero header switches to Bengali: *"সব শীর্ষ বাংলাদেশি বিক্রেতার পিসি যন্ত্রাংশের দাম তুলনা করুন"*
  - Navigation links change to: *হোম, পিসি বিল্ডার, কম্পোনেন্ট, তুলনা, এআই অ্যাসিস্ট্যান্ট*.
* **Evidence Reference**: [`TestSS2/04_Home_Bangla_Localization_Dark.png`](TestSS2/04_Home_Bangla_Localization_Dark.png)

---

## 5. Live Search & Multi-Retailer Price Matrix
**URL**: `http://localhost:5173/search`

### 🔹 Test Case 5.1: Multi-Retailer Real-Time Aggregation Query
* **Goal**: Prove aggregation across Star Tech, Ryans, Techland, Skyland, and UCC.
* **Step-by-Step Actions**:
  1. In the search bar, type: `rtx` and press Enter (or navigate to `/search?q=rtx`).
* **Expected Result**: 
  - Results header displays: *"Results for 'rtx': Found 200+ listings across 5+ Bangladeshi retailers"*.
  - Product cards display live BDT prices, in-stock badges, and retailer tags (Star Tech green, Ryans blue, Techland purple).
* **Evidence Reference**: [`TestSS2/05_Search_Page_GPU_Results_Dark.png`](TestSS2/05_Search_Page_GPU_Results_Dark.png)

---

### 🔹 Test Case 5.2: Retailer & Category Sidebar Filtering
* **Goal**: Demonstrate multi-parameter facet filtering.
* **Step-by-Step Actions**:
  1. In the left filter sidebar, under **Retailers**, uncheck all except **Star Tech** and **Techland**.
  2. Click the **Graphics Card** category pill.
* **Expected Result**: 
  - Grid updates instantly without page reload, showing only GPUs available at Star Tech and Techland.
* **Evidence Reference**: [`TestSS2/06_Search_Page_Filters_Applied_Dark.png`](TestSS2/06_Search_Page_Filters_Applied_Dark.png)

---

### 🔹 Test Case 5.3: Non-Existent Hardware Query Handling
* **Goal**: Demonstrate graceful zero-results fallback.
* **Step-by-Step Actions**:
  1. Search for: `xyznonexistenthardware99999`
* **Expected Result**: 
  - Clean empty state: *"Results for 'xyznonexistenthardware99999': Found 0 listings across 0 retailers"*.
  - Renders quick-access category buttons (*Processor, GPU, RAM, SSD*), zero crashes.
* **Evidence Reference**: [`TestSS2/EX-03_Search_No_Results_Found_Dark.png`](TestSS2/EX-03_Search_No_Results_Found_Dark.png)

---

## 6. Product Details, Specs & Price Trend
**URL**: `http://localhost:5173/product/:id`

### 🔹 Test Case 6.1: Cross-Store Price Comparison Matrix
* **Goal**: Show where to buy a specific component at the lowest price in BD.
* **Step-by-Step Actions**:
  1. Click any product from the search results (e.g. *AMD Ryzen 7 7800X3D*).
  2. Scroll down to the **"Available Retailers & Live Offers"** table.
* **Expected Result**: 
  - Lists prices side-by-side: Star Tech (৳52,000), Ryans (৳52,500), Techland (৳51,800).
  - Highlights lowest price with green **"Best Deal"** badge and direct external link to store.
* **Evidence Reference**: [`TestSS2/08_Product_Details_Hero_Dark.png`](TestSS2/08_Product_Details_Hero_Dark.png)

---

### 🔹 Test Case 6.2: Historical Price History Trend Chart
* **Goal**: Demonstrate Recharts interactive price analytics over 30, 60, and 90 days.
* **Step-by-Step Actions**:
  1. On the product page, look at the **"Price Trend & History"** graph.
  2. Hover your mouse over the data points.
* **Expected Result**: 
  - Interactive tooltip reveals date and historical BDT price.
  - Price volatility indicator displays trend (*"Price dropped 4.2% this month"*).
* **Evidence Reference**: [`TestSS2/10_Product_Details_Price_History_Dark.png`](TestSS2/10_Product_Details_Price_History_Dark.png)

---

## 7. Custom PC Builder & Compatibility Engine
**URL**: `http://localhost:5173/pc-builder`

### 🔹 Test Case 7.1: Adding Core Components & Real-Time Calculation
* **Goal**: Demonstrate modular PC assembly, live wattage summation, and BDT totals.
* **Step-by-Step Actions**:
  1. Open `/pc-builder`.
  2. Click **+ Choose** on the **CPU** slot.
  3. Select **AMD Ryzen 7 7800X3D** (৳52,000 | 120W).
  4. Click **+ Choose** on the **GPU** slot.
  5. Select **ASUS TUF Gaming RTX 4070 Ti 12GB** (৳1,05,000 | 285W).
* **Expected Result**: 
  - Right summary panel recalculates total: `৳1,57,000`.
  - Estimated Power Draw updates to `480W` (CPU 120W + GPU 285W + 75W base).
* **Evidence Reference**: [`TestSS2/15_PC_Builder_Full_Rig_Populated_Dark.png`](TestSS2/15_PC_Builder_Full_Rig_Populated_Dark.png)

---

### 🔹 Test Case 7.2: Hardware Compatibility Engine (Socket Mismatch Detection)
* **Goal**: Demonstrate real-time socket rule validation preventing user buying mistakes.
* **Step-by-Step Actions**:
  1. With **Intel Core i7-14700K (LGA1700 socket)** selected in CPU slot.
  2. Click **Motherboard** slot and select an AMD board: **MSI PRO B650M-A (AM5 socket)**.
* **Expected Result**: 
  - Compatibility score drops from 100% to **25%**.
  - A prominent red warning badge appears:
    `❌ Socket LGA1700 != motherboard (AM5)`
  - Alert notification flags: *"Incompatible CPU socket and Motherboard chipset detected!"*
* **Evidence Reference**: [`TestSS2/EX-01_Incompatible_Socket_Warning_Dark.png`](TestSS2/EX-01_Incompatible_Socket_Warning_Dark.png)

---

### 🔹 Test Case 7.3: PSU Wattage Deficit Warning
* **Goal**: Verify power supply overload safety detection.
* **Step-by-Step Actions**:
  1. Configure high-power parts: Intel i7-14700K + RTX 4090 OC (total system draw ~778W).
  2. In the **Power Supply (PSU)** slot, select a **650W PSU** (Corsair CV650).
* **Expected Result**: 
  - Power bar exceeds 100% and turns bright red.
  - Warning banner displays:
    `⚠ System requires ~778W, PSU provides only 650W (+128W deficit)`
* **Evidence Reference**: [`TestSS2/EX-02_Insufficient_PSU_Wattage_Dark.png`](TestSS2/EX-02_Insufficient_PSU_Wattage_Dark.png)

---

### 🔹 Test Case 7.4: 3D Interactive Rig Visualizer
* **Goal**: Demonstrate Three.js WebGL spatial chassis simulation.
* **Step-by-Step Actions**:
  1. On the PC Builder page, click the **"3D Visualizer"** tab/panel.
  2. Left-click and drag the mouse on the 3D chassis.
  3. Scroll mouse wheel to zoom in/out.
* **Expected Result**: 
  - The PC cabinet model rotates in 3D space with dynamic lighting and reflection.
  - Installed components highlight inside the transparent chassis casing.
* **Evidence Reference**: [`TestSS2/17_PC_Builder_3D_Rig_Visualizer_Dark.png`](TestSS2/17_PC_Builder_3D_Rig_Visualizer_Dark.png)

---

## 8. Offline Quotation Sheet (Quote Export)
**URL**: `http://localhost:5173/pc-builder/quote`

### 🔹 Test Case 8.1: A4 Printable Quotation Generation
* **Goal**: Allow Bangladeshi buyers to print physical sheets to take directly to computer shops in Multiplan / IDB Bhaban.
* **Step-by-Step Actions**:
  1. With a complete build loaded, click **"Print / Export Quote"** (or navigate to `/pc-builder/quote`).
* **Expected Result**: 
  - Formats as an official A4 quotation sheet with:
    - Unique Quotation ID (e.g. `KINBA-2026-8841`)
    - Timestamp & Date
    - Component Table with Brand, Model, Retailer, and BDT Unit Price
    - Total Cost (`৳2,45,300`)
    - **"Print Quotation (PDF)"** CTA button.
* **Evidence Reference**: [`TestSS2/18_PC_Builder_Quote_View_Dark.png`](TestSS2/18_PC_Builder_Quote_View_Dark.png)

---

## 9. Smart Multi-Store Cart Optimization
**URL**: `http://localhost:5173/pc-builder/checkout`

### 🔹 Test Case 9.1: Multi-Store Price Split Savings Calculation
* **Goal**: Prove how PC Kinba algorithm saves money by splitting orders across stores.
* **Step-by-Step Actions**:
  1. Navigate to `/pc-builder/checkout`.
* **Expected Result**: 
  - Compares:
    - **Single Store Purchase (Star Tech only)**: `৳2,53,700`
    - **Optimized Multi-Store Split**: `৳2,45,300`
  - Green savings banner highlights: *"You save ৳8,400 by splitting purchases across Star Tech (3 parts), Ryans (2 parts), and Techland (3 parts)"*.
  - Displays one-click direct checkout buttons for each store.
* **Evidence Reference**: [`TestSS2/19_PC_Builder_MultiStore_Checkout_Dark.png`](TestSS2/19_PC_Builder_MultiStore_Checkout_Dark.png)

---

## 10. Hardware Compare Battleground & Radar Chart
**URL**: `http://localhost:5173/compare`

### 🔹 Test Case 10.1: 6-Axis Hardware Comparison Radar
* **Goal**: Demonstrate multi-attribute hardware indexing (Raster, Ray Tracing, VRAM, Power, Thermals, Value).
* **Step-by-Step Actions**:
  1. Open `/compare`.
  2. Select **Product A**: `NVIDIA GeForce RTX 4070 Ti 12GB`
  3. Select **Product B**: `AMD Radeon RX 7900 XT 20GB`
* **Expected Result**: 
  - 6-axis Radar Chart renders comparing both cards in real-time.
  - Winner badges highlight:
    - `Ray Tracing Winner: RTX 4070 Ti (+28%)`
    - `VRAM Winner: RX 7900 XT (+66% - 20GB vs 12GB)`
  - Direct live retailer price matrix for both products is shown side-by-side.
* **Evidence Reference**: [`TestSS2/24_Hardware_Compare_Radar_Chart_Dark.png`](TestSS2/24_Hardware_Compare_Radar_Chart_Dark.png)

---

## 11. Tonima AI Conversational Architect
**URL**: `http://localhost:5173/ai-assistant`

### 🔹 Test Case 11.1: Natural Language Build Recommendation
* **Goal**: Demonstrate AI conversational recommendations with budget constraints.
* **Step-by-Step Actions**:
  1. Navigate to `/ai-assistant`.
  2. In the AI chat prompt box, type:
     *"Recommend a 1440p gaming build for 120k BDT with an AMD processor."*
  3. Click **Send / Generate**.
* **Expected Result**: 
  - Tonima AI streams a structured response recommending compatible parts (Ryzen 5 7600 + RX 6700 XT / RTX 4060 Ti + 32GB DDR5).
  - Displays total calculated budget in BDT.
  - Includes a **"Load this build into PC Builder"** button that populates the rig slots in one click!
* **Evidence Reference**: [`TestSS2/28_Tonima_AI_Chat_Interaction_Dark.png`](TestSS2/28_Tonima_AI_Chat_Interaction_Dark.png)

---

## 12. Cyber Security & Defensive SQLi / XSS Suite

### 🔹 Test Case 12.1: Login Form Tautology SQL Injection (`' OR '1'='1`)
* **URL**: `http://localhost:5173/login`
* **Attack Vector**: Attempting authentication bypass using SQL boolean tautology.
* **Payload**: 
  - Email: `' OR '1'='1' --`
  - Password: `' OR '1'='1'`
* **Expected Defensive Result**: 
  - Backend and Supabase ORM safely parameterize the query.
  - The login attempt fails with danger toast `❌ Invalid login credentials`.
  - **Zero database syntax leakage, zero unauthorized bypass**.
* **Evidence Reference**: [`TestSS2/AUTH-SQLI-01_Login_SQL_Injection_Defense_Dark.png`](TestSS2/AUTH-SQLI-01_Login_SQL_Injection_Defense_Dark.png)

---

### 🔹 Test Case 12.2: Admin Privilege Escalation SQL Injection (`admin'--`)
* **URL**: `http://localhost:5173/login`
* **Attack Vector**: Commenting out password verification clause in SQL.
* **Payload**: 
  - Email: `admin'--@pckinba.com`
  - Password: `1' UNION SELECT 1, 'admin', 'hash'--`
* **Expected Defensive Result**: 
  - Input is treated as literal email string constant.
  - Access is denied with standard authentication rejection.
* **Evidence Reference**: [`TestSS2/AUTH-SQLI-02_Admin_Bypass_SQLi_Defense_Dark.png`](TestSS2/AUTH-SQLI-02_Admin_Bypass_SQLi_Defense_Dark.png)

---

### 🔹 Test Case 12.3: Registration Multi-Field SQLi & Piggybacked Queries
* **URL**: `http://localhost:5173/register`
* **Attack Vector**: Injecting destructive DDL statements into text inputs.
* **Payload**: 
  - Full Name: `Robert'); DROP TABLE users;--`
  - Email: `victim'+(SELECT 1)+'@pckinba.com`
* **Expected Defensive Result**: 
  - Client & server validation sanitizes strings; parameterization prevents SQL statement termination.
* **Evidence Reference**: [`TestSS2/AUTH-SQLI-03_Register_SQLi_Validation_Dark.png`](TestSS2/AUTH-SQLI-03_Register_SQLi_Validation_Dark.png)

---

### 🔹 Test Case 12.4: Search Endpoint UNION-Based Data Extraction
* **URL**: `http://localhost:5173/search?q=%27%20UNION%20SELECT%20null%2C%20username%2C%20password%20FROM%20users--`
* **Attack Vector**: Attempting to extract unauthorized database tables via search query.
* **Payload**: `' UNION SELECT null, username, password FROM users--`
* **Expected Defensive Result**: 
  - `sanitizeCliArg()` and query tokenizers strip malicious SQL delimiters.
  - Database executes a safe parameterized text search returning `0 listings found` without errors or table dumps.
* **Evidence Reference**: [`TestSS2/SEC-SQLI-01_Search_Union_SQLi_Defense_Dark.png`](TestSS2/SEC-SQLI-01_Search_Union_SQLi_Defense_Dark.png)

---

### 🔹 Test Case 12.5: Malicious Cross-Site Scripting (XSS) Injection
* **URL**: `http://localhost:5173/search`
* **Attack Vector**: Injecting executable JavaScript in user input fields.
* **Payload**: `<script>alert("XSS")</script>`
* **Expected Defensive Result**: 
  - React JSX escaping and DOMPurify render the payload as harmless text. No popup script executes.
* **Evidence Reference**: [`TestSS2/EX-04_Search_Special_Char_Injection_Dark.png`](TestSS2/EX-04_Search_Special_Char_Injection_Dark.png)

---

## 🏆 Teacher Demonstration Summary Checklist

During your evaluation, you can present this exact 5-point live flow:
1. **Show Security & Auth**: Caps Lock detection, password eye reveal, and SQLi rejection on `/login`.
2. **Show Aggregation**: Search `rtx` on `/search` and filter by Star Tech / Techland.
3. **Show Core Innovation (PC Builder)**: Assemble CPU + GPU, show live BDT price and wattage estimation on `/pc-builder`.
4. **Show Error Protection**: Pair an Intel CPU with an AMD Motherboard to trigger the red Socket Incompatibility alert.
5. **Show Intelligence**: Ask Tonima AI for a 120k BDT gaming PC recommendation on `/ai-assistant`.
