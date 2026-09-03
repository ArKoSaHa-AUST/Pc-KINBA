# PC-KINBA — Comprehensive Technical Documentation & Architecture Manual

> **PC-KINBA** is an AI-powered computer hardware discovery, real-time multi-retailer price comparison, intelligent PC builder, and hardware compatibility platform built specifically for the Bangladeshi computing marketplace.

---

## 1. Project Overview

### 1.1 Executive Summary
PC-KINBA solves the fragmentation in Bangladesh's PC parts market. When shopping for computer parts in Bangladesh, consumers often navigate across dozens of disparate e-commerce storefronts (StarTech, Ryans, Techland, Skyland, Potaka IT, Sell Tech, Ultra Technology, PCB Store, PC House, etc.) with mismatched names, volatile pricing, varying warranty policies, and stock discrepancies.

PC-KINBA unifies the market by providing:
- **Universal Hardware Catalog**: Deduplicated and canonically reconciled hardware database with standardized specifications.
- **Open-Discovery Live Store Price Comparison Agent**: An autonomous AI agent that searches the live web across Google, DuckDuckGo, and Bing, discovers all local retailers stocking a component, and extracts real-time prices and stock availability using local open models (Qwen 2.5 via Ollama) and cloud fallbacks (Groq API pool).
- **Interactive 3D PC Builder**: Real-time compatibility auditor checking CPU socket types, RAM generation, TDP power limits, physical casing clearance, and multi-retailer lowest-cost basket routing.
- **Tonima AI Hardware Advisor**: Conversational AI assistant providing budget-optimized builds and bottleneck analyses.
- **Bilingual Experience**: Full localization in English and Bengali (বাংলা) with native Bangladeshi Taka (৳ / BDT) currency formatting.

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Version / Tool | Purpose |
|---|---|---|
| **Framework** | React 19 + Vite 8 | Ultra-fast Hot Module Replacement (HMR) and reactive Single Page Application (SPA) |
| **Language** | TypeScript (Strict Mode) | Strong type safety with `verbatimModuleSyntax` and zero-`any` compliance |
| **Styling** | Vanilla CSS + Tailwind CSS | Cyber-futuristic dark mode theme, glassmorphism, responsive CSS grid layouts |
| **Animation** | Framer Motion | Smooth component transitions, layout animations, and reactive micro-interactions |
| **3D Rendering** | Three.js + React Three Fiber + Drei | Holographic 3D chassis visualization, interactive PC rig assembly, and tilt effects |
| **Icons** | Lucide React | Clean, scalable modern icons |
| **Localization** | i18next + react-i18next | Dynamic bilingual language switcher (English / বাংলা) |
| **Auth Client** | Supabase JS Client (`@supabase/supabase-js`) | Session management, OAuth sign-in, user profiles, and cloud data persistence |

### 2.2 Backend & APIs
| Technology | Details | Purpose |
|---|---|---|
| **Runtime** | Node.js (v24 runtime) | Asynchronous event-driven backend service |
| **Web Server** | Express.js | High-throughput REST API serving search, suggest, details, and live scanning |
| **Subprocess IPC** | Python Bridge (`child_process.spawn`) | Invokes Python scraping engines and AI scanner pipelines dynamically |
| **Email Service** | Nodemailer / Resend SMTP | Transactional welcome emails, password resets, and verification workflows |
| **Database** | SQLite3 (`pcbuilder.db`) | Embedded, low-latency relational database with full-text search indexing |
| **Cloud DB** | Supabase / PostgreSQL | Cloud database for user profiles, saved builds, wishlists, and reviews |

### 2.3 AI & Machine Learning Stack
| Component | Engine | Role |
|---|---|---|
| **Local Open Model** | **Qwen 2.5 (1.5B)** via Ollama | Primary local extractor running on CPU (`http://127.0.0.1:11434`) for zero-token, private, instant JSON parsing of web search snippets |
| **Cloud Model Pool** | **Groq Cloud API** (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`) | Automated 17-key round-robin failover pool for cloud extraction with browser User-Agent headers |
| **Conversational AI** | **Google Gemini 1.5 Pro / Flash** | Drives the Tonima AI hardware assistant and contextual build advisor |

### 2.4 Data Ingestion & Web Scraping
| Tool | Purpose |
|---|---|
| **Python 3.12** | Core language for scrapers and reconciliation engines |
| **BeautifulSoup4** | HTML parsing and CSS selector extraction |
| **`curl_cffi`** | Browser TLS fingerprint impersonation (`chrome120`) to bypass Cloudflare anti-bot checks |
| **Standard `requests`** | Fallback HTTP client with custom headers |
| **`concurrent.futures`** | Multi-threaded parallel candidate scraping and concurrent store scanning |

---

## 3. Database Architecture & Schemas

The system utilizes a dual-database architecture:
1. **Local High-Performance SQLite (`pcbuilder.db`)**: Handles hardware catalogs, product listings, store prices, search queries, and historical scraping logs.
2. **Supabase PostgreSQL**: Manages user authentication, saved PC builds, product reviews, and personal wishlists.

```
┌────────────────────────────────────────────────────────┐
│                      SQLite DB                         │
│                    (pcbuilder.db)                      │
│                                                        │
│   ┌───────────────┐          1:N   ┌───────────────┐   │
│   │   products    │ ───────────────│   listings    │   │
│   └───────────────┘                └───────────────┘   │
│           │ 1:N                            │           │
│           ▼                                ▼           │
│   ┌───────────────┐                ┌───────────────┐   │
│   │product_aliases│                │ scraped_cache │   │
│   └───────────────┘                └───────────────┘   │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ Synchronized / Linked via Product IDs
                           ▼
┌────────────────────────────────────────────────────────┐
│                    Supabase Cloud                      │
│                     (PostgreSQL)                       │
│                                                        │
│   ┌───────────────┐          1:N   ┌───────────────┐   │
│   │     users     │ ───────────────│    builds     │   │
│   └───────────────┘                └───────────────┘   │
│           │ 1:N                            │ 1:N       │
│           ▼                                ▼           │
│   ┌───────────────┐                ┌───────────────┐   │
│   │   wishlists   │                │    reviews    │   │
│   └───────────────┘                └───────────────┘   │
└────────────────────────────────────────────────────────┘
```

### 3.1 SQLite Tables (`pcbuilder.db`)
Located at `scrapers/db.py`:

#### 1. `products` (Canonical Product Catalog)
Represents a unique hardware component irrespective of which retailer sells it:
- `id` (TEXT, PRIMARY KEY): Unique UUID identifier.
- `canonical_name` (TEXT NOT NULL): Clean standardized title (e.g. `AMD Ryzen 7 7700 Processor`).
- `fingerprint` (TEXT UNIQUE NOT NULL): Normalized alphanumeric identity string used for deduplication.
- `brand` (TEXT): Manufacturer name (AMD, Intel, ASUS, MSI, Gigabyte, Corsair, etc.).
- `type` / `category` (TEXT): Component category (`processor`, `graphics-card`, `motherboard`, `ram`, `ssd`, `power-supply`, `casing`, `cooling`).
- `base_model` / `model` (TEXT): Core chipset/architecture family (e.g. `B650`, `RTX 4060`, `Ryzen 7`).
- `capacity` (TEXT): Memory/storage size (e.g. `16GB`, `1TB`, `8GB`).
- `speed` (TEXT): Clock speed or frequency (e.g. `6000MHz`, `5.3GHz`).
- `created_at` / `updated_at` (TEXT): ISO 8601 timestamps.

#### 2. `listings` (Retailer Specific Product Listings)
Contains real-world store listings linked to a canonical product:
- `id` (TEXT, PRIMARY KEY): Unique listing UUID.
- `product_id` (TEXT, FOREIGN KEY -> products.id): Link to canonical product.
- `retailer` (TEXT NOT NULL): Retailer identifier (e.g., `startech`, `ryans`, `techland`, `skyland`, `pchouse`).
- `title` (TEXT NOT NULL): Full original title as published by the store.
- `brand` (TEXT): Retailer's identified brand.
- `price` (INTEGER NOT NULL): Current price in Bangladeshi Taka (BDT).
- `price_str` (TEXT): Formatted price with currency symbol (e.g. `21,500৳`).
- `product_url` (TEXT UNIQUE NOT NULL): Direct outbound link to the product on the store's website.
- `image_url` (TEXT): Direct CDN link to product photography.
- `in_stock` (BOOLEAN): Real-time inventory status.
- `is_verified` (BOOLEAN): `1` for curated partner retailers; `0` for open-web AI discovered stores.
- `last_scraped_at` (TEXT): Timestamp of last verification.

#### 3. `product_aliases`
- `id` (TEXT PRIMARY KEY): Unique alias UUID.
- `product_id` (TEXT, FOREIGN KEY -> products.id): Associated canonical product.
- `alias_text` (TEXT UNIQUE NOT NULL): Variant title or model number variant.
- `confidence` (REAL): Matching confidence score (0.0 to 1.0).

---

## 4. How Scraping & Live Price Intelligence Works

The scraping architecture operates across two distinct operational pipelines:
1. **Direct Fast Scrapers (`scrapers/fast_scrapers.py`)**: Targeted scraping of established computer retailers.
2. **Open-Discovery Live Store Scanner (`scrapers/google_live_scanner.py`)**: Web-scale AI discovery of *any* store selling the product across Bangladesh.

```
                         USER REQUEST
                  (e.g., "AMD Ryzen 7 7700")
                              │
                              ▼
               ┌──────────────────────────────┐
               │    Fast Scraper Subsystem    │
               │  (StarTech, Ryans, Techland, │
               │   Skyland, PC House, etc.)   │
               └──────────────┬───────────────┘
                              │
                    Results Found & Parsed
                              │
                              ▼
               ┌──────────────────────────────┐
               │  Multi-Engine Open Discovery │
               │    (Google, DuckDuckGo,      │
               │            Bing)             │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │ Domain Filter & Guard Checks │
               │ (Rejects Reddit, YouTube,    │
               │  PC builds, Save/EMI chips)  │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │   Multi-Tier AI Extractor    │
               │                              │
               │  [Tier 1] Regex (0ms, 0 tok) │
               │             │                │
               │  [Tier 2] Qwen 2.5:1.5b      │
               │           (Local Ollama)     │
               │             │                │
               │  [Tier 3] Groq Cloud Pool    │
               │           (17-key rotation)  │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │  Deduplication & Best Deal   │
               │       Ranking Engine         │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │ Render Live Comparison Table │
               │ (Zero empty fake store cards)│
               └──────────────────────────────┘
```

### 4.1 Fast Scraper Engine (`fast_scrapers.py`)
- **Supported Retailers**: StarTech, Ryans Computers, Techland BD, Skyland BD, Sell Tech BD, Ultra Technology, PCB Store, PC House BD, Creatus Computer, Potaka IT, UCC, and Village BD.
- **TLS Fingerprint Bypass**: Cloudflare and bot-defense firewalls block basic Python `requests` or `urllib` headers. `fast_scrapers.py` uses `curl_cffi.requests` with `impersonate="chrome120"`, replicating Chrome's TLS handshake and HTTP/2 settings.
- **Price Sanitization & Spec Guard**:
  - Bangladeshi store DOMs often place promo chips (e.g., `Save: ৳2,000` or `৳1,500/mo EMI`) at the top of cards.
  - The `clean_price()` function filters out terms like `save`, `discount`, `emi`, `ghz`, `core`, `ram`, `ssd` so promotional badges or hardware spec numbers are never misparsed as item prices.
  - Targets direct price nodes (e.g. Techland `.mt-auto .text-red-600` instead of upper discount badges).

### 4.2 Open-Discovery Live Store Scanner (`google_live_scanner.py`)
When a user clicks **"Live Google Scan"** on a product page or visits an uncached product:
1. **Multi-Engine Search Query**:
   Executes web queries for `"<product_name> price in bd"` against DuckDuckGo and Bing APIs with fallback search endpoints.
2. **Domain Sanitation & Blacklisting**:
   Discards social networks, forums, review sites, and video portals (`youtube.com`, `facebook.com`, `reddit.com`, `wikipedia.org`, `quora.com`, `medium.com`, `tomshardware.com`).
3. **Parallel Candidate Evaluation**:
   Uses `ThreadPoolExecutor(max_workers=5)` to evaluate up to 10 candidates concurrently. This reduces scan execution time from ~25s down to 8–12 seconds.
4. **Multi-Tier AI Extraction Pipeline (`ai_extractor.py`)**:
   - **Tier 1 (Instant Regex Heuristic)**: Checks title and snippet for explicit BDT currency formats (`21,500৳`, `BDT 21,500`). If a known domain is matched with an unambiguous price, it finishes in 0ms with 0 tokens.
   - **Tier 2 (Local Open Model via Ollama)**: If ambiguous, queries local **`qwen2.5:1.5b`** on `http://127.0.0.1:11434/api/generate` in JSON mode. It extracts `{ shop_name, price, in_stock, is_relevant }` completely offline with 0 cloud API tokens.
   - **Tier 3 (Cloud Groq API Failover Pool)**: If Ollama is offline or times out, the scanner rotates through a pool of 17 Groq API keys using `qwen/qwen3.8-27b` and `openai/gpt-oss-120b`, transmitting browser `User-Agent` headers to bypass Cloudflare 403 blocks.
5. **Dynamic Retailer Styling**:
   For newly discovered open-web shops (e.g., *Gadget & Gear*, *Pickaboo*, *Potaka IT*):
   - Computes shop initials for visual avatars.
   - Deterministically generates a neon accent color from the domain hash.
   - Tags the store with the purple `Discovered via Google AI` badge.
6. **Zero-Placeholder Guarantee**:
   Unlike legacy versions that padded the table with 12 fixed stores marked "Call for Price", the scanner **only** displays stores that actually list the product with a verified price.

---

## 5. Detailed Page-by-Page Walkthrough

### 5.1 Home Page (`/` — `client/src/pages/Home.tsx`)
- **Hero Section**: Cyber-aesthetic glowing hero showcasing the live search bar with real-time suggestion dropdown.
- **Interactive 3D Hardware Display**: Floating 3D hardware components rendered via Three.js.
- **Top Categories Grid**: Direct navigation to Processors, Graphics Cards, Motherboards, RAM, Storage, Power Supplies, and Casings.
- **Market Highlights**: Lowest-price component deals of the day and top trending hardware.
- **Testimonials & Brand Carousel**: Intel, AMD, NVIDIA, ASUS, MSI, Gigabyte, Corsair brand showcases.

### 5.2 Search & Discovery Page (`/search` — `client/src/pages/SearchPage.tsx`)
- **Smart Query & Category Intent Detection**:
  - Detects hardware intent automatically:
    - `"Intel i7"` -> Locks category to **Processor**.
    - `"RTX 4060"` -> Locks category to **Graphics Card**.
    - `"B650"` -> Locks category to **Motherboard**.
- **Interactive Filter Pills**: Category filters (`All`, `Processors`, `Graphics Cards`, `Motherboards`, `Memory / RAM`, `Storage / SSD`, `Power Supplies`, `Casings`, `Cooling Solutions`).
- **Store Filter Chips**: Checkbox filters for all 12 major retailers.
- **Price Range Slider & Sorting**: Price Low-to-High, High-to-Low, Popularity, and Newest.
- **Product Card Features**:
  - High-res photography with lazy-loading and fallback SVG shields.
  - Retailer source badge with direct price in BDT.
  - Quick-action buttons: "View Details", "Add to PC Builder", "Add to Compare".

### 5.3 Product Details & Live Price Comparison (`/product/:id` — `ProductDetailsPage.tsx` & `ProductHero.tsx`)
- **Product Gallery**: High-resolution gallery with thumbnail switcher and zoom-on-hover.
- **Key Specifications Breakdown**: Structured display of Socket, Cores/Threads, Base/Boost Clocks, TDP, Architecture, VRAM, and Interface.
- **Live Store Price Comparison Hub**:
  - Summary counter displaying active stores (e.g. `Comparing 7 active store(s)`).
  - Breakdown badge showing count of stores found by AI (e.g. `3 from Google AI`).
  - **`Live Google Scan` Trigger**: Interactive button allowing users to re-scan the entire market on-demand.
  - Animated live scanning banner informing the user of background multi-engine crawling and AI extraction.
  - **Store Rows Sorted by Price**:
    - Retailer logo / custom color badge.
    - Store name with `Verified Partner` (cyan shield) or `Discovered via Google AI` (purple sparkle) badge.
    - Live stock indicator (`In Stock` / `Pre-Order`).
    - Verified price in BDT (`৳18,399`).
    - **`BEST DEAL`** glowing green badge awarded to the retailer with the lowest price.
    - **`Buy Direct`** outbound link opening the product on the merchant's store.
- **Alternative Parts & Recommendations**: Suggests compatible components in the same performance bracket.
- **Community Reviews Section**: User ratings, review breakdowns, and verified purchase feedback.

### 5.4 PC Builder Studio (`/pc-builder` — `client/src/pages/PCBuilderPage.tsx`)
- **Modular Build Slots**: CPU, CPU Cooler, Motherboard, Memory (RAM), Storage (SSD/HDD), Video Card (GPU), Power Supply Unit (PSU), and Case/Chassis.
- **Dynamic Component Selection Modal**: Opens categorized hardware drawer with instantaneous search and compatibility filtering.
- **Real-Time Compatibility Engine (`compatibility.ts`)**:
  - **Socket Compatibility**: Ensures AMD AM5 CPUs only fit AM5 motherboards, Intel LGA1700 CPUs only fit 600/700-series motherboards.
  - **Memory Generation**: Verifies DDR5 motherboards receive DDR5 RAM; DDR4 receives DDR4.
  - **Power Budget Calculator**: Calculates combined component TDP and warns if selected PSU wattage lacks safe headroom (+20% recommendation).
- **Interactive 3D Assembly Viewport (`AssemblyViewport3D.tsx`)**:
  - Visual 3D chassis preview showing component installation status.
- **Total Price Optimizer**: Aggregates total build cost by selecting the lowest-priced retailer for each part.
- **Export & Sharing**: Export build sheet to PDF, copy shareable build link, or transfer parts to checkout.

### 5.5 Build Checkout & Cart Routing (`/pc-builder/checkout` — `BuildCheckoutPage.tsx`)
- Groups selected build components by retailer.
- Direct checkout deep-links to each respective store to purchase items at their best prices.

### 5.6 Hardware Comparison Matrix (`/compare` — `client/src/pages/ComparePage.tsx`)
- Side-by-side spec comparison table for up to 4 components simultaneously.
- **Performance Radar Chart (`PerformanceRadarChart.tsx`)**: Visualizes relative benchmark scores (Single-core, Multi-core, Gaming, Value, Power Efficiency).
- **AI Callout Auditor (`AICalloutAuditor.tsx`)**: Automated AI summary highlighting the price-to-performance winner.
- **Retailer Price Matrix**: Side-by-side comparison of store availability and prices across all compared items.

### 5.7 Tonima AI Hardware Assistant (`/ai-assistant` — `AIAssistantPage.tsx`)
- Conversational chat powered by Google Gemini 1.5.
- Answers complex hardware questions: *"Build me an AMD gaming PC under 70k BDT"*, *"Will an RTX 4060 bottleneck on an i5-10400?"*.
- Real-time build preview HUD and interactive hardware advice.

### 5.8 User Authentication & Profile (`/login`, `/register`, `/profile`)
- Supabase Auth integration with secure JWT token storage.
- User profile dashboard displaying saved PC builds, wishlist items, price drop notification alerts, and build history timelines.

---

## 6. End-to-End System Workflows

### 6.1 Workflow 1: Live Hardware Search
```
1. User enters text in search bar (e.g., "rtx 4060")
2. Frontend calls GET /api/search?q=rtx+4060
3. Backend checks intent: recognizes "RTX" -> category = 'graphics-card'
4. Backend executes SQL query with category filters against pcbuilder.db
5. If cached results are fresh, returns listings immediately
6. Frontend displays product grid with prices, badges, and retailer options
```

### 6.2 Workflow 2: On-Demand Open-Discovery Market Scan
```
1. User opens Product Details page for a component
2. User clicks "Live Google Scan"
3. Frontend dispatches GET /api/product/:id/live-prices
4. Express spawns scrapers/google_live_scanner.py with product fingerprint
5. Scanner queries DuckDuckGo & Bing for "<product> price in bd"
6. ThreadPoolExecutor(max_workers=5) processes candidate URLs:
   - Sanitizes domain & filters non-shopping sites
   - Tier 1: Extracts BDT currency via Regex
   - Tier 2: Queries local Qwen 2.5:1.5b via Ollama (0 cloud tokens)
   - Tier 3: Falls back to Groq Cloud API rotation pool if needed
7. Reconciles discovered listings into SQLite listings table
8. Returns verified shops array to Express server
9. Frontend animates new store rows into the comparison table
10. Best Deal badge dynamically attaches to the lowest price
```

### 6.3 Workflow 3: PC Rig Compatibility Verification
```
1. User adds "AMD Ryzen 5 7600" to CPU slot
2. State records socket: "AM5", TDP: 65W
3. User opens Motherboard drawer:
   - Compatibility engine filters motherboards to socket == "AM5"
   - Incompatible LGA1700 boards are grayed out with a warning
4. User selects "B650M Gaming X AX" (Memory Type: DDR5)
5. RAM drawer automatically restricts suggestions to DDR5 kits
6. Real-time wattage meter tallies total TDP and verifies PSU capacity
```

---

## 7. CI/CD & Quality Assurance Workflows

All automated GitHub Actions workflows live in `.github/workflows/`:

| Workflow File | Trigger | Tasks & Checks Performed |
|---|---|---|
| [lint.yml](file:///.github/workflows/lint.yml) | Push / PR to `main`, `develop` | `npm ci` -> `npm run format` (Prettier) -> `npm run lint` (ESLint strict check) -> `npx tsc --noEmit` (TypeScript validation) |
| [build.yml](file:///.github/workflows/build.yml) | Push / PR | `npm ci` -> `npm run build` (`tsc -b && vite build`) for production asset bundling |
| [security.yml](file:///.github/workflows/security.yml) | Push / PR / Weekly Cron | `npm audit --audit-level=high` + Gitleaks secret and token leak detection |
| [docker.yml](file:///.github/workflows/docker.yml) | Push / PR | Hadolint Dockerfile linting + `docker compose config` validation + build layer caching |
| [codeql.yml](file:///.github/workflows/codeql.yml) | Push / PR / Schedule | GitHub CodeQL semantic security analysis for JavaScript/TypeScript |
| [test.yml](file:///.github/workflows/test.yml) | Push / PR | Backend and frontend unit and integration test runner |
| [deploy.yml](file:///.github/workflows/deploy.yml) | Push to `main` | Production deployment orchestration |
| [release.yml](file:///.github/workflows/release.yml) | Release tag push | Automated changelog generation and GitHub Release creation |

### Running Quality Checks Locally
```bash
# 1. Format verification with Prettier
cd client && npm run format

# 2. Strict ESLint check
cd client && npm run lint

# 3. TypeScript compilation check
cd client && npx tsc --noEmit

# 4. Production build compile
cd client && npm run build

# 5. Scrapers Python compilation check
python3 -m py_compile scrapers/ai_extractor.py scrapers/fast_scrapers.py scrapers/google_live_scanner.py
```

---

## 8. Local Setup & Execution Guide

### 8.1 Prerequisites
- **Node.js**: v20 or v24+
- **Python**: v3.11 or v3.12+
- **Ollama** (optional for local AI): `curl -fsSL https://ollama.com/install.sh | sh && ollama pull qwen2.5:1.5b`

### 8.2 Environment Configuration
Create a `.env` file in the project root:
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEYS="gsk_key1,gsk_key2,gsk_key3"
GEMINI_API_KEY="your_gemini_api_key"
OLLAMA_API_URL="http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL="qwen2.5:1.5b"
```

### 8.3 Starting the Development Stack
```bash
# 1. Start Local Ollama Service (in background)
ollama serve

# 2. Start Express Backend
node server.js

# 3. Start Vite Frontend Client
cd client
npm install
npm run dev
```

The application will be accessible at:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
