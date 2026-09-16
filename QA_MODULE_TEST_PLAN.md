# PC Kinba — QA Module Test Plan

## 1. Overview
- **Total modules discovered**: 250
- **Breakdown by service**:
  - **Frontend (React + Vite)**: 177 modules (Pages: 19, Components: 124, Stores/Auth: 4, API/Services: 15, Hooks: 7, Data/Utils/i18n: 8)
  - **Backend (Express / Node.js)**: 57 modules (Routes/Endpoints: 34, Business Logic/Services: 6, AI Pipeline: 11, Utilities/Scripts: 6)
  - **AI Service & Python Scraping Subsystem**: 11 modules (FastAPI service: 1, Scrapers/AI engines: 10)
  - **Cross-cutting / System-level**: 5 modules (Database Schema/Migrations, Docker Compose & Networking, Multi-Retailer Ingestion, End-to-End Auth, External Integrations)
- **Testing tools recommended per layer**: See [§5. Recommended Tooling](#5-recommended-tooling)

---

## 2. Module Inventory

### 2.1 Frontend

#### [Home Page]
- **Path**: `client/src/pages/Home.tsx`
- **Type**: Page
- **Responsibility**: Renders landing page containing Hero search, AI assistant teaser, feature highlights, price comparison widget, statistics, and trusted brand partners.
- **Depends on**: `Hero`, `InteractiveAI`, `Features`, `Comparison`, `PCBuilderShowcase`, `Statistics`, `Testimonials`, `CTA`, `TrustedBrands`
- **Test type needed**: Component / Visual / E2E
- **Key test cases**:
  - [ ] Renders all landing page sections without crashing.
  - [ ] Search input in hero navigates to `/search?q={query}` on enter or button click.
  - [ ] CTA buttons route correctly to `/builder` and `/ai-assistant`.
  - [ ] Responsive layout adapts correctly on mobile viewports (< 768px).
- **Priority**: High
- **Status**: Not started

#### [Components Page]
- **Path**: `client/src/pages/ComponentsPage.tsx`
- **Type**: Page
- **Responsibility**: Marketplace hardware catalog displaying category taxonomy navigation, dynamic product grid, and filter sidebar.
- **Depends on**: `CategoryTaxonomyNav`, `ProductGrid`, `FilterSidebar`, `useComponentQuery`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Loads products for selected category with loading skeleton fallback.
  - [ ] Category selection updates URL query parameter `?category=`.
  - [ ] Handles empty product list with "No components found" message.
  - [ ] Network error shows toast/error alert with retry action.
- **Priority**: High
- **Status**: Not started

#### [Search Page]
- **Path**: `client/src/pages/SearchPage.tsx`
- **Type**: Page
- **Responsibility**: Search engine results page presenting multi-retailer price matrix, facet filters, live scraping trigger, and sorting.
- **Depends on**: `api/products.ts`, `ProductCard`, `FilterSidebar`, `CompareDrawer`, `RecentlyViewed`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Parses `q`, `category`, `brand`, `minPrice`, `maxPrice`, `sort` from URL query string on load.
  - [ ] Displays live retailer price comparison cards with verified lowest price badge.
  - [ ] Triggers on-demand live scraping when user clicks "Scan live web".
  - [ ] Handles zero search results gracefully with suggested alternative queries.
- **Priority**: Critical
- **Status**: Not started

#### [Product Details Page]
- **Path**: `client/src/pages/ProductDetailsPage.tsx`
- **Type**: Page
- **Responsibility**: Product detail view displaying specifications, multi-store pricing table, 30d/90d price history chart, alternative parts, user reviews, and price alert subscription.
- **Depends on**: `ProductHero`, `TechnicalSpecs`, `PriceHistoryChart`, `ProductReviews`, `AlternativePartsSection`, `RelatedProducts`, `StickyBuyBar`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Fetches product details by ID and aggregates live store listings.
  - [ ] Displays buy signal badge (Buy / Fair / Wait) computed from historical prices.
  - [ ] Sticky buy bar appears when scrolling past hero section and links to lowest-price retailer.
  - [ ] Non-existent product ID displays 404 / "Product Not Found" fallback.
- **Priority**: Critical
- **Status**: Not started

#### [PC Builder Page]
- **Path**: `client/src/pages/PCBuilderPage.tsx`
- **Type**: Page
- **Responsibility**: Custom PC building workstation with slot selection, real-time compatibility audit, 3D rig visualization, estimated wattage, and multi-store basket total.
- **Depends on**: `useComponentStore`, `BuilderHero`, `ComponentGrid`, `BuildSummary`, `ComponentSelectModal`, `AssemblyViewport3D`, `compatibility.ts`
- **Test type needed**: Unit / Integration / E2E
- **Key test cases**:
  - [ ] Adding CPU filters compatible Motherboards by socket type (e.g. AM5 vs LGA1700).
  - [ ] Calculates total wattage draw and warns if selected PSU has insufficient headroom (< 20%).
  - [ ] Renders 3D assembly viewport with interactive orbit controls.
  - [ ] Auto-build button populates complete parts list based on target budget preset.
  - [ ] Reset build clears state and confirms before wiping data.
- **Priority**: Critical
- **Status**: Not started

#### [Compare Page]
- **Path**: `client/src/pages/ComparePage.tsx`
- **Type**: Page
- **Responsibility**: Side-by-side product comparison tool with multi-attribute matrix, radar charts, and AI callout auditor.
- **Depends on**: `useCompare`, `CompareTable`, `PerformanceRadarChart`, `HolographicInspector3D`, `AICalloutAuditor`, `RetailerPriceMatrix`
- **Test type needed**: Integration / Visual
- **Key test cases**:
  - [ ] Allows adding up to 4 items from the same or compatible category.
  - [ ] Highlights differences between component technical specs.
  - [ ] Computes radar chart dimensions (Gaming, Productivity, Value, Thermals).
  - [ ] Share comparison button copies shareable deep-link URL.
- **Priority**: High
- **Status**: Not started

#### [Build Compare Page]
- **Path**: `client/src/pages/BuildComparePage.tsx`
- **Type**: Page
- **Responsibility**: Side-by-side comparison of two entire PC builds, analyzing total cost, total wattage, component tiers, and store dispersion.
- **Depends on**: `useComponentStore`, `MetricCard`, `PartsTable`
- **Test type needed**: Integration
- **Key test cases**:
  - [ ] Compares current active build against a selected saved or preset build.
  - [ ] Displays delta in total price (৳ diff) and performance score.
  - [ ] Handles comparison when one build has missing core components.
- **Priority**: Medium
- **Status**: Not started

#### [Build Checkout Page]
- **Path**: `client/src/pages/BuildCheckoutPage.tsx`
- **Type**: Page
- **Responsibility**: Multi-retailer basket routing, per-store cart itemization, estimated shipping cost, and direct retailer checkout links.
- **Depends on**: `useCart`, `api/cart.ts`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Groups build parts by retailer (e.g. 3 parts from StarTech, 2 from Ryans, 1 from Techland).
  - [ ] Generates valid direct affiliate / product URLs for each retailer.
  - [ ] Recalculates total cost including per-store delivery estimates.
- **Priority**: High
- **Status**: Not started

#### [Build Quote Page]
- **Path**: `client/src/pages/BuildQuotePage.tsx`
- **Type**: Page
- **Responsibility**: Generates printable and downloadable PDF/HTML quotations with official pricing, date stamps, and retailer breakdowns.
- **Depends on**: `useComponentStore`, `i18n/format.ts`
- **Test type needed**: Unit / Visual
- **Key test cases**:
  - [ ] Formats all prices with Bengali Taka symbol (`৳`) and comma separators.
  - [ ] Browser print stylesheet hides navigation and renders clean white A4 invoice layout.
  - [ ] Includes unique quotation reference ID and expiration notice.
- **Priority**: Medium
- **Status**: Not started

#### [Build Library Page]
- **Path**: `client/src/pages/BuildLibraryPage.tsx`
- **Type**: Page
- **Responsibility**: Public community build repository with budget filters, use-case tags (Gaming, Editing, Office), likes, and clone-to-builder actions.
- **Depends on**: `api/builds.ts`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Fetches published community builds with pagination.
  - [ ] Clicking "Clone Build" loads parts directly into active `useComponentStore` and redirects to `/builder`.
  - [ ] Filter by budget range and use-case category.
- **Priority**: Medium
- **Status**: Not started

#### [Shared Build Page]
- **Path**: `client/src/pages/SharedBuildPage.tsx`
- **Type**: Page
- **Responsibility**: Public landing view for short build link codes (`/b/:code`), displaying parts table, pricing, and clone action.
- **Depends on**: `api/builds.ts`, `PartsTable`, `useComponentStore`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Resolves 6-character build hash to full component parts list.
  - [ ] Invalid / expired code displays error message and redirects to Builder.
  - [ ] "Customize This Build" button clones build into user's session.
- **Priority**: High
- **Status**: Not started

#### [Profile Page]
- **Path**: `client/src/pages/ProfilePage.tsx`
- **Type**: Page
- **Responsibility**: Authenticated user dashboard with profile editing, saved builds timeline, active price alerts, wishlist items, and security settings.
- **Depends on**: `useAuth`, `ProfileInfoCard`, `BuildHistoryTimeline`, `TrackedProductsPanel`, `NotificationPanel`, `SecurityDangerZone`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Unauthenticated access redirects to `/auth/login`.
  - [ ] Updates user display name and avatar with image compression.
  - [ ] Lists user's saved builds with delete and edit actions.
  - [ ] Allows cancelling active price drop alerts.
- **Priority**: High
- **Status**: Not started

#### [AI Assistant Page]
- **Path**: `client/src/pages/AIAssistantPage.tsx`
- **Type**: Page
- **Responsibility**: Dedicated Tonima AI conversational hardware assistant page hosting interactive chat workspace and 3D chassis HUD.
- **Depends on**: `TonimaHero`, `ChatWorkspace`, `BuildPreviewHUD`, `Chassis3DViewer`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Initializes chat session with welcome greeting and quick archetype suggestions.
  - [ ] Displays live build preview HUD synchronized with conversational recommendations.
  - [ ] 3D chassis highlights component slots as user discusses specific parts.
- **Priority**: Critical
- **Status**: Not started

#### [Auth Pages (Login, Register, ForgotPassword, ResetPassword, Verify, AuthLayout)]
- **Path**: `client/src/pages/auth/*.tsx`
- **Type**: Pages / Layout
- **Responsibility**: User authentication flows (sign up, sign in, OAuth, password recovery, email verification) with 3D canvas visuals.
- **Depends on**: `useAuth`, `api/auth.ts`, `Kinba3DPCRigAssembly`, `Kinba3DQuantumCore`, `passwordStrength.ts`
- **Test type needed**: Unit / Integration / E2E
- **Key test cases**:
  - [ ] Form validations: email regex, password minimum length, matching password confirmations.
  - [ ] Password strength meter reacts dynamically to entropy and common patterns.
  - [ ] Submits login credentials to Supabase and stores auth tokens in cookies/localStorage.
  - [ ] Google OAuth popup/redirect initiates valid session.
  - [ ] Error messages display gracefully for invalid credentials or unconfirmed emails.
- **Priority**: Critical
- **Status**: Not started

#### [Navbar & Global Navigation]
- **Path**: `client/src/components/Navbar.tsx`
- **Type**: Component
- **Responsibility**: Sticky header with brand logo, search input with live suggestions, language switcher, theme toggle, cart/compare drawer badges, and auth dropdown.
- **Depends on**: `LanguageSwitcher`, `ThemeSwitcher`, `NotificationBell`, `UserMenu`, `api/products.ts`
- **Test type needed**: Component / Unit
- **Key test cases**:
  - [ ] Debounced search input fetches suggestions from `/api/search/suggest`.
  - [ ] Clicking outside suggestion dropdown closes it.
  - [ ] Compare counter badge updates dynamically when items are added to comparison queue.
  - [ ] Mobile hamburger menu toggles navigation links on small screens.
- **Priority**: High
- **Status**: Not started

#### [Chat Workspace (Tonima AI)]
- **Path**: `client/src/components/ai/ChatWorkspace.tsx`
- **Type**: Component
- **Responsibility**: Multi-turn conversational chat interface communicating with `/api/ai/build` and `/api/ai/refine`.
- **Depends on**: `BuildPreviewHUD`, `CompatibilityGauge`, `api/client.ts`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Sends user natural language prompt (e.g. "Gaming build under 1.5 lakh") to backend AI endpoint.
  - [ ] Renders markdown response table with retailer prices and direct store links.
  - [ ] Quick refine pills (e.g. "Upgrade to 32GB RAM", "Trim 15k taka") dispatch structured refinement requests.
  - [ ] Displays loading typing indicator during AI reasoning and handles timeout/rate limit errors gracefully.
- **Priority**: Critical
- **Status**: Not started

#### [Build Preview HUD & Compatibility Gauge]
- **Path**: `client/src/components/ai/BuildPreviewHUD.tsx` & `CompatibilityGauge.tsx`
- **Type**: Component
- **Responsibility**: Real-time HUD showing part selections, estimated price total, multi-store dispersion, and animated radial compatibility gauge.
- **Depends on**: `i18n/format.ts`, `useComponentStore`
- **Test type needed**: Unit / Component
- **Key test cases**:
  - [ ] Computes and displays total price in BDT.
  - [ ] Compatibility gauge reflects 100% when all parts match, and displays warning badges on conflicts.
  - [ ] "Apply to Builder" transfers parts into global PC builder store.
- **Priority**: High
- **Status**: Not started

#### [3D Chassis & Hardware Viewers]
- **Path**: `client/src/components/ai/Chassis3DViewer.tsx`, `HolographicCore.tsx`, `AssemblyScene.tsx`, `AssemblyViewport3D.tsx`
- **Type**: Component
- **Responsibility**: Three.js / React Three Fiber interactive 3D visualizations of PC chassis, holographic AI core, and component assemblies.
- **Depends on**: `@react-three/fiber`, `@react-three/drei`, `three`
- **Test type needed**: Component / Visual
- **Key test cases**:
  - [ ] WebGL context initializes without memory leaks on unmount.
  - [ ] Mouse drag orbits the 3D model; scroll wheel zooms within clamped bounds.
  - [ ] Fallback 2D placeholder renders when WebGL is unsupported or disabled in browser.
- **Priority**: Medium
- **Status**: Not started

#### [Compatibility Engine (Client)]
- **Path**: `client/src/components/builder/compatibility.ts`
- **Type**: Util / Service
- **Responsibility**: Comprehensive client-side hardware compatibility rules: CPU socket matching, RAM DDR generation, PCIe generation, PSU wattage headroom (estimated draw + 25%), Cooler height vs Casing clearance, and Motherboard form factor vs Casing support.
- **Depends on**: `client/src/types/components.ts`
- **Test type needed**: Unit (100% Coverage Target)
- **Key test cases**:
  - [ ] AM5 CPU (e.g. Ryzen 7 7700) is compatible with B650/X670 motherboards, incompatible with B550/Z790.
  - [ ] DDR5 RAM is rejected on DDR4 motherboards.
  - [ ] Total system wattage calculation includes TDP of CPU + GPU + 80W overhead; flags PSU if wattage < total * 1.2.
  - [ ] Cooler height exceeding case max CPU cooler height flags clearance conflict.
  - [ ] ATX motherboard selected in Mini-ITX chassis triggers form factor error.
- **Priority**: Critical
- **Status**: Not started

#### [Auto Build & Optimizer Rules]
- **Path**: `client/src/components/builder/autoBuild.ts` & `optimizerRules.ts`
- **Type**: Util / Service
- **Responsibility**: Deterministic greedy algorithm allocating target budget percentages to components (e.g. Gaming: 40% GPU, 25% CPU, 12% Mobo, 8% RAM, 7% SSD, 8% PSU+Case).
- **Depends on**: `builderCatalog.ts`, `compatibility.ts`
- **Test type needed**: Unit
- **Key test cases**:
  - [ ] Generates 100% compatible build within ±5% of specified budget for budgets from ৳ 40,000 to ৳ 400,000.
  - [ ] Optimizer identifies bottlenecks (e.g. RTX 4080 paired with Core i3) and suggests balanced alternatives.
- **Priority**: High
- **Status**: Not started

#### [Product Reviews Subsystem]
- **Path**: `client/src/components/product/ProductReviews/*.tsx` (16 files)
- **Type**: Components
- **Responsibility**: Full review ecosystem: aggregate ratings, verified buyer badges, pros/cons submission form, helpful upvotes, keyword search, rating filter, and photo gallery.
- **Depends on**: `api/products.ts`, `useAuth`, `StarRating`
- **Test type needed**: Integration / Component
- **Key test cases**:
  - [ ] Submitting review requires authentication; prompts login if unauthenticated.
  - [ ] Rating breakdown calculates percentages for 1 to 5 stars correctly.
  - [ ] Helpful button increments vote count and prevents multiple upvotes per user.
  - [ ] Filter by star rating (e.g. 5 stars only) updates visible review list.
- **Priority**: Medium
- **Status**: Not started

#### [Price History & Alert Subsystem]
- **Path**: `client/src/components/product/PriceHistoryChart.tsx` & `PriceAlertModal.tsx`
- **Type**: Components
- **Responsibility**: Visualizes 30d/90d price fluctuations with buy/fair/wait verdict and provides subscription modal for price drop alerts via email.
- **Depends on**: `api/priceHistory.ts`, `api/priceAlerts.ts`, `useAuth`
- **Test type needed**: Integration / Unit
- **Key test cases**:
  - [ ] Renders SVG/canvas price history line chart with min/max price callouts.
  - [ ] Displays buy signal badge correctly based on moving average trends.
  - [ ] Subscribing to price alert validates target price is less than current lowest price.
  - [ ] Sends alert subscription payload to `/api/product/:id/price-alert`.
- **Priority**: High
- **Status**: Not started

#### [Alternative Parts Engine (Client)]
- **Path**: `client/src/components/product/AlternativeParts/*.tsx`
- **Type**: Components
- **Responsibility**: Suggests cheaper alternatives, higher-tier performance upgrades, and same-spec hardware from other brands.
- **Depends on**: `api/products.ts`, `AlternativeCard`, `AlternativeFilters`
- **Test type needed**: Integration
- **Key test cases**:
  - [ ] Categorizes alternatives into "Cheaper", "Better Performance", and "Similar Specs".
  - [ ] Displays price difference badge (e.g. "-৳ 3,500" or "+৳ 5,000").
  - [ ] Clicking alternative redirects to its product details page.
- **Priority**: Medium
- **Status**: Not started

#### [Global Component Store (Zustand)]
- **Path**: `client/src/store/useComponentStore.ts`
- **Type**: Store
- **Responsibility**: Central state management for PC Builder: active parts dictionary, custom items, total pricing, validation errors, and local storage persistence.
- **Depends on**: `zustand`, `compatibility.ts`
- **Test type needed**: Unit (100% Coverage Target)
- **Key test cases**:
  - [ ] `setPart(slot, product)` updates slot and triggers compatibility validation.
  - [ ] `removePart(slot)` clears slot and recalculates wattage and total cost.
  - [ ] `clearBuild()` restores initial empty state.
  - [ ] Persists build state to `localStorage` and restores on page reload.
- **Priority**: Critical
- **Status**: Not started

#### [Authentication Context & Route Guard]
- **Path**: `client/src/auth/AuthProvider.tsx`, `auth-context.ts`, `useAuth.ts`, `ProtectedRoute.tsx`
- **Type**: Store / Context / Hook / Guard
- **Responsibility**: Manages Supabase auth session, token refresh, login/logout transitions, user profile metadata, and protected route redirection.
- **Depends on**: `@supabase/supabase-js`, `react-router-dom`
- **Test type needed**: Unit / Integration
- **Key test cases**:
  - [ ] `AuthProvider` detects existing session on initial load.
  - [ ] `ProtectedRoute` allows access when authenticated; redirects to `/auth/login?redirect={path}` when unauthenticated.
  - [ ] `signOut` clears user session and cached profile data.
- **Priority**: Critical
- **Status**: Not started

#### [API Client Layer & Service Modules]
- **Path**: `client/src/api/*.ts` (14 modules) & `client/src/services/imageUpload.ts`
- **Type**: Service / Client Layer
- **Responsibility**: HTTP client invoking backend REST endpoints (`products`, `builderCatalog`, `builds`, `cart`, `categories`, `compare`, `filters`, `notifications`, `priceAlerts`, `priceHistory`, `wishlist`, `auth`).
- **Depends on**: `fetch` / `axios`, Supabase SDK
- **Test type needed**: Unit / Integration (Mocked Server)
- **Key test cases**:
  - [ ] Injects JWT `Bearer` token in `Authorization` header when user is signed in.
  - [ ] Handles HTTP 401 Unauthorized by triggering auth refresh or redirect.
  - [ ] Handles HTTP 429 Rate Limit with exponential backoff or user-facing notification.
  - [ ] Serializes and deserializes query params and response payloads matching API contracts.
- **Priority**: Critical
- **Status**: Not started

#### [Custom Hooks (Cart, Compare, Wishlist, FilterSync, RealtimeStock, BuilderCatalog)]
- **Path**: `client/src/hooks/*.ts` (7 hooks)
- **Type**: Hook
- **Responsibility**: Encapsulates reactive data fetching, local storage syncing, and state persistence for cart, comparison queue, wishlists, and filters.
- **Depends on**: `client/src/api/*`, `zustand`, `react`
- **Test type needed**: Unit (Hooks Testing Library)
- **Key test cases**:
  - [ ] `useCompare`: Adds and removes product IDs from local storage comparison queue (max 4).
  - [ ] `useFilterSync`: Synchronizes active filter state with browser URL search params without page reload.
  - [ ] `useWishlist`: Toggles product wishlist state and synchronizes with Supabase `wishlists` table.
- **Priority**: High
- **Status**: Not started

#### [i18n & Formatting Utilities]
- **Path**: `client/src/i18n/format.ts` & `i18n/index.ts`
- **Type**: Util / i18n
- **Responsibility**: Localizes currency formatting (`৳ 1,25,000`), formats dates, and manages bilingual dictionary translations (English / Bangla).
- **Depends on**: `i18next`, `react-i18next`
- **Test type needed**: Unit
- **Key test cases**:
  - [ ] `formatBDT(150000)` outputs `"৳ 1,50,000"` (Indian/Bangladeshi numbering grouping).
  - [ ] Language switch updates all UI keys without requiring full page refresh.
  - [ ] Handles null/undefined prices gracefully by returning `"Call for Price"` or `"N/A"`.
- **Priority**: Medium
- **Status**: Not started

---

### 2.2 Backend

#### [Root Health & Status]
- **Path**: `server.js` (`GET /`)
- **Type**: Route / Endpoint
- **Responsibility**: Health check endpoint returning API service status, frontend URL, and available endpoints list.
- **Depends on**: `express`
- **Test type needed**: Integration / Unit
- **Key test cases**:
  - [ ] Returns HTTP 200 with `{ status: "online", service: "PC Kinba API Server" }`.
- **Priority**: Low
- **Status**: Not started

#### [Search Suggestion Endpoint]
- **Path**: `server.js` (`GET /api/search/suggest`)
- **Type**: Route / Controller
- **Responsibility**: Autocompletion search suggestions utilizing Groq LLM query expansion and Supabase database catalog matches.
- **Depends on**: `lib/groq.js` (`getGroqSuggestions`), `apiLimiter`, Supabase
- **HTTP status codes**: `200 OK`, `400 Bad Request`, `429 Too Many Requests`, `500 Internal Error`
- **Validation rules**: `q` query string required (min 2 chars, sanitized).
- **Key test cases**:
  - [ ] Valid query `"rtx 4060"` returns array of matching search suggestions.
  - [ ] Empty or whitespace `q` returns empty array `[]` with HTTP 200.
  - [ ] Groq API failure falls back seamlessly to database prefix matching without crashing.
- **Priority**: High
- **Status**: Not started

#### [Search Supabase Listings]
- **Path**: `server.js` (`GET /api/search`)
- **Type**: Route / Controller / Service
- **Responsibility**: Precision search across retailer listings with model code gating, negative category exclusions, and intelligent "Call for Price" estimation.
- **Depends on**: `detectSearchIntent`, `getQueryVariations`, `searchSupabaseListings`, `batchEnrichCallForPrice`
- **HTTP status codes**: `200 OK`, `429 Too Many Requests`, `500 Internal Error`
- **Validation rules**: `q` string sanitized against log & SQL injection.
- **Key test cases**:
  - [ ] Search for `"4060"` strictly rejects `"3060"`, `"4070"`, `"4080"`, and `"4090"`.
  - [ ] Standalone GPU search excludes laptops and prebuilt PCs unless explicitly requested.
  - [ ] Listings with price 0 or "Call for Price" are enriched with estimated market prices via `batchEnrichCallForPrice`.
  - [ ] Returns structured JSON matching `UnifiedProduct` schema with store breakdown.
- **Priority**: Critical
- **Status**: Not started

#### [Live Web Search Scraping Endpoint]
- **Path**: `server.js` (`GET /api/search/live` & `GET /api/live-scan`)
- **Type**: Route / Controller
- **Responsibility**: Spawns Python live scanner subprocess (`scrapers/google_live_scanner.py`) to scrape Google, DuckDuckGo, and Bing in real-time for live prices across BD retailers.
- **Depends on**: `child_process.execFileSync`, `sanitizeCliArg`, `commandLimiter`
- **HTTP status codes**: `200 OK`, `400 Bad Request`, `429 Rate Limit`, `500 Internal Error`
- **Validation rules**: `q` parameter sanitized strictly against CLI argument injection (`/[^a-zA-Z0-9\s.\-_+]/g`).
- **Key test cases**:
  - [ ] Malicious CLI arguments containing shell metacharacters (`;`, `&&`, `|`, `` ` ``) are stripped and neutralized.
  - [ ] Executes Python scanner subprocess and parses stdout JSON into structured listings.
  - [ ] Process timeout (60s) terminates cleanly and returns partial results or error message.
- **Priority**: Critical
- **Status**: Not started

#### [Product Details & Live Pricing Endpoints]
- **Path**: `server.js` (`GET /api/product/:id`, `GET /api/product/:id/live-prices`)
- **Type**: Route / Controller
- **Responsibility**: Retrieves canonical product specs, joins all live store listings, computes buy signal, and triggers live on-demand retailer price checks.
- **Depends on**: Supabase `products`, `listings`, `product_specs`, `deriveBuySignal`
- **HTTP status codes**: `200 OK`, `404 Not Found`, `500 Internal Error`
- **Key test cases**:
  - [ ] Valid product ID returns product metadata, spec key-values, and array of retailer offers.
  - [ ] Invalid/non-existent product ID returns HTTP 404 with error message.
  - [ ] Deduplicates store offers and identifies the lowest price store.
- **Priority**: Critical
- **Status**: Not started

#### [Product Alternatives Endpoints]
- **Path**: `server.js` (`GET /api/product/:id/alternatives`, `GET /api/alternatives`)
- **Type**: Route / Service
- **Responsibility**: Computes intelligent hardware alternatives categorized into budget (cheaper), upgrade (performance), and sidegrade (competing brand).
- **Depends on**: `lib/alternatives.js` (`buildProductAlternatives`, `deriveCategory`)
- **HTTP status codes**: `200 OK`, `404 Not Found`, `500 Internal Error`
- **Key test cases**:
  - [ ] Returns alternatives within the same hardware category (GPU -> GPU, CPU -> CPU).
  - [ ] Cheaper alternatives have prices strictly lower than target component.
  - [ ] Upgrade alternatives have higher synthetic benchmark tier.
- **Priority**: High
- **Status**: Not started

#### [Catalog Reconciliation Endpoint]
- **Path**: `server.js` (`POST /api/reconcile`)
- **Type**: Route / Controller / Job
- **Responsibility**: Triggers the Python reconciliation engine (`scrapers/reconcile.py`) to deduplicate listings and map them to canonical product records.
- **Depends on**: `scrapers/reconcile.py`, `commandLimiter`
- **HTTP status codes**: `200 OK`, `403 Forbidden`, `500 Internal Error`
- **Key test cases**:
  - [ ] Requires administrative API key or secure authorization token.
  - [ ] Executes deduplication without corrupting existing product IDs.
- **Priority**: High
- **Status**: Not started

#### [Product Reviews Endpoints]
- **Path**: `server.js` (`GET /api/product/:id/reviews`, `POST /api/product/:id/reviews`, `POST /api/reviews/:id/helpful`)
- **Type**: Route / Controller
- **Responsibility**: CRUD operations for user reviews: fetching approved reviews with stats, creating verified reviews, and recording helpful upvotes.
- **Depends on**: Supabase `reviews`, `authActionLimiter`, `apiLimiter`
- **HTTP status codes**: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `500 Error`
- **Validation rules**: `rating` integer 1–5, `title` min 3 chars, `review_text` min 10 chars, `user_id` authenticated.
- **Key test cases**:
  - [ ] Unauthenticated `POST` review request returns HTTP 401.
  - [ ] Rating outside 1–5 returns HTTP 400 with validation error.
  - [ ] Aggregate rating calculation correctly weighs 1–5 star counts and computes average to 1 decimal place.
  - [ ] Upvoting review increments `helpful_count` atomically.
- **Priority**: High
- **Status**: Not started

#### [Price Alerts & Notification Endpoints]
- **Path**: `server.js` (`GET /api/product/:id/price-alert`, `POST /api/product/:id/price-alert`, `DELETE /api/product/:id/price-alert`, `GET /api/user/price-alerts`, `POST /api/test/price-drop-alert`, `POST /api/price-alerts/process`)
- **Type**: Route / Service / Cron
- **Responsibility**: Manages price drop subscriptions, stores alert thresholds in Supabase `price_alerts`, dispatches email confirmations via `mailer.js`, and runs automated cron check.
- **Depends on**: Supabase `price_alerts`, `mailer.js` (`sendPriceAlertConfirmationEmail`, `sendPriceDropAlertEmail`)
- **HTTP status codes**: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `500 Error`
- **Validation rules**: `target_price` must be a positive number; `email` must be valid RFC 5322 format.
- **Key test cases**:
  - [ ] Creating alert sends confirmation email with product title, target price, and current price.
  - [ ] `/api/price-alerts/process` queries active alerts where `current_lowest_price <= target_price`, triggers alert email, and marks alert as triggered.
  - [ ] Deleting alert removes record from database.
- **Priority**: Critical
- **Status**: Not started

#### [Price History & Buy Signal Endpoint]
- **Path**: `server.js` (`GET /api/product/:id/price-history`)
- **Type**: Route / Service
- **Responsibility**: Returns daily historical price records for a product across all stores and derives buy recommendation (`buy`, `fair`, `wait`).
- **Depends on**: Supabase `price_history`, `lib/priceInsights.js` (`deriveBuySignal`)
- **HTTP status codes**: `200 OK`, `404 Not Found`, `500 Internal Error`
- **Key test cases**:
  - [ ] Returns array of price points sorted chronologically with `date`, `price`, `retailer`.
  - [ ] If current price is at 30-day low, `signal` is `"buy"`.
  - [ ] If current price is > 10% above 30-day average, `signal` is `"wait"`.
- **Priority**: High
- **Status**: Not started

#### [Builder Catalog & Saved Builds Endpoints]
- **Path**: `server.js` (`GET /api/builder/catalog`, `GET /api/builds/:code/og.png`, `GET /b/:code`)
- **Type**: Route / Controller
- **Responsibility**: Serves optimized, cached builder parts catalog grouped by category, generates dynamic OpenGraph PNG social preview image with Sharp, and redirects short build URLs.
- **Depends on**: Supabase `products`, `listings`, `sharp`, `apiLimiter`
- **HTTP status codes**: `200 OK`, `302 Found`, `404 Not Found`, `500 Error`
- **Key test cases**:
  - [ ] Catalog endpoint returns products mapped with structured specs (socket, ram type, wattage, form factor).
  - [ ] `GET /b/:code` redirects to frontend `/builds/shared?code={code}` with HTTP 302.
  - [ ] `GET /api/builds/:code/og.png` generates valid PNG image with 1200x630 dimensions showing build summary and total price.
- **Priority**: Critical
- **Status**: Not started

#### [Marketplace Products, Categories & Filters Endpoints]
- **Path**: `server.js` (`GET /api/products`, `GET /api/categories`, `GET /api/filters`, `GET /api/cart`, `GET /api/compare`)
- **Type**: Route / Controller / Service
- **Responsibility**: High-performance paginated product queries with multi-faceted filtering (brand, category, price range, in-stock only, specs), category tree taxonomy, and cart basket optimization.
- **Depends on**: Supabase `products`, `categories`, `listings`
- **HTTP status codes**: `200 OK`, `400 Bad Request`, `500 Internal Error`
- **Key test cases**:
  - [ ] Pagination parameters `page` and `limit` return correct subsets and total count metadata.
  - [ ] Sorting by `price_asc`, `price_desc`, `rating`, `popular` sorts data accurately.
  - [ ] `/api/cart` calculates optimal retailer combination minimizing shipping costs.
- **Priority**: Critical
- **Status**: Not started

#### [Avatar & Image Upload Endpoints]
- **Path**: `server.js` (`POST /api/upload/avatar`, `POST /api/upload/imagekit`)
- **Type**: Route / Controller
- **Responsibility**: Processes base64 or multipart user avatar images, resizes/optimizes to WebP via Sharp, and uploads to Supabase Storage bucket `avatars`.
- **Depends on**: `sharp`, Supabase Storage, `authActionLimiter`
- **HTTP status codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `413 Payload Too Large`, `500 Error`
- **Validation rules**: Max image size 15MB, allowed mime types: `image/jpeg`, `image/png`, `image/webp`.
- **Key test cases**:
  - [ ] Rejects non-image files with HTTP 400.
  - [ ] Optimizes and resizes avatar to 256x256 WebP before storing.
  - [ ] Updates `profiles.avatar_url` in Supabase for the authenticated user.
- **Priority**: Medium
- **Status**: Not started

#### [Transactional Email Service (Mailer)]
- **Path**: `mailer.js` & `server.js` (`POST /api/send-welcome`)
- **Type**: Service / Endpoint
- **Responsibility**: Manages Nodemailer SMTP transport, renders responsive HTML email templates for welcome emails, price alert confirmations, and price drop notifications.
- **Depends on**: `nodemailer`, `dotenv`
- **HTTP status codes**: `200 OK`, `400 Bad Request`, `500 Internal Error`
- **Key test cases**:
  - [ ] Renders valid HTML with inline styling and Bangladeshi Taka currency symbols.
  - [ ] SMTP connection failure is caught, logged safely, and returns clean error response without crashing server.
  - [ ] Validates recipient email before attempting dispatch.
- **Priority**: High
- **Status**: Not started

#### [Product Matching & Normalization Engine]
- **Path**: `lib/normalizer.js`
- **Type**: Util / Service
- **Responsibility**: Hardware title parsing: extracts manufacturer vs vendor brand, removes noise words, isolates base model, generates order-independent canonical fingerprint (`generateFingerprint`), checks variant equivalence (`isSameProductVariant`), and groups 5-store offers.
- **Depends on**: Pure JavaScript / Regex
- **Test type needed**: Unit (100% Target)
- **Key test cases**:
  - [ ] `"GIGABYTE GeForce RTX 4070 Super WindForce OC 12G"` produces fingerprint `"nvidia-rtx-4070-super-12gb"`.
  - [ ] `"Asus ROG Strix B650E-F Gaming WiFi"` matches `"MSI MAG B650 Tomahawk WiFi"` as same chipset class (`"amd-b650"`).
  - [ ] Price normalizer converts `0`, `"0"`, `"৳0"`, `"Call for Price"` to `null`.
  - [ ] Groups listings from multiple retailers under a single canonical product ID.
- **Priority**: Critical
- **Status**: Not started

#### [Groq LLM Rotation Pool]
- **Path**: `lib/groq.js`
- **Type**: Service / Infrastructure
- **Responsibility**: Automated round-robin rotation across 17 Groq API keys with exponential backoff on HTTP 429 rate limits for autosuggest and query expansion.
- **Depends on**: `fetch`, `dotenv`
- **Test type needed**: Unit / Integration
- **Key test cases**:
  - [ ] Rotates to next key when encountering rate limit (HTTP 429) or token exhaustion.
  - [ ] Handles complete key pool exhaustion gracefully by returning fallback search suggestions.
  - [ ] Enforces timeout (5s) to prevent blocking user requests.
- **Priority**: High
- **Status**: Not started

#### [Price Estimation Engine (KNN + LLM Fallback)]
- **Path**: `lib/priceEstimator.js`
- **Type**: Service
- **Responsibility**: Estimates realistic market prices for "Call for Price" or unlisted items using historical price records, K-Nearest-Neighbor (KNN) specification matching, and Groq fallback.
- **Depends on**: Supabase, `lib/groq.js`
- **Test type needed**: Unit / Integration
- **Key test cases**:
  - [ ] Enriches array of listings having price 0 with estimated BDT prices and sets `is_estimated: true`.
  - [ ] Returns KNN average price within ±15% of actual market price for common SKUs.
  - [ ] Leaves known valid prices untouched (`is_estimated: false`).
- **Priority**: High
- **Status**: Not started

#### [Price Insights & Buy Signal Analyzer]
- **Path**: `lib/priceInsights.js`
- **Type**: Service / Util
- **Responsibility**: Calculates rolling 30-day and 90-day price averages, standard deviations, and returns buying recommendation verdict (`buy`, `fair`, `wait`).
- **Depends on**: Pure JavaScript / Math
- **Test type needed**: Unit
- **Key test cases**:
  - [ ] Returns `"buy"` when current price <= 30-day minimum price.
  - [ ] Returns `"wait"` when current price >= 1.10 * 30-day average price.
  - [ ] Returns `"fair"` when current price is within normal historical band.
- **Priority**: High
- **Status**: Not started

#### [AI Build Pipeline (Tonima AI Backend)]
- **Path**: `lib/ai/` (11 modules: `orchestrator.js`, `intent.js`, `budget.js`, `planner.js`, `retriever.js`, `validator.js`, `explainer.js`, `refiner.js`, `llm.js`, `schemas.js`, `benchmarksData.js`) & `server.js` (`POST /api/ai/build`, `POST /api/ai/refine`, `GET /api/ai/session/:id`)
- **Type**: AI Service / Pipeline / Controllers
- **Responsibility**: End-to-end multi-step AI PC building pipeline:
  1. `intent.js`: Parses user prompt into structured budget, primary use case (Gaming, Video Editing, AI/ML, Office), tier preference, and constraints.
  2. `budget.js`: Applies archetype-specific percentage splits to determine budget ceilings per component category.
  3. `planner.js`: Selects target hardware performance tiers (e.g. Tier 4 GPU + Tier 3 CPU).
  4. `retriever.js`: Queries Supabase `listings` and `products` for live lowest-price components matching plan.
  5. `validator.js`: Server-side compatibility check (socket, DDR generation, PSU headroom, form factor).
  6. `explainer.js`: Generates natural language breakdown and rationale in English or Bengali.
  7. `refiner.js`: Executes conversational modifications (swap component, trim budget, upgrade RAM/GPU).
  8. `orchestrator.js`: Coordinates execution stages and maintains in-memory active session cache (`ACTIVE_SESSIONS`).
- **Depends on**: Supabase, `lib/groq.js`, `lib/ai/llm.js`, `lib/ai/schemas.js`
- **HTTP status codes**: `200 OK`, `400 Bad Request`, `429 Rate Limit`, `500 Internal Error`
- **Validation rules**: All stage inputs and outputs validated via Zod schemas (`BuildIntentSchema`, `BuildPlanSchema`, `BuildResultSchema`).
- **Key test cases**:
  - [ ] Generates complete 8-component build within ±5% of requested budget.
  - [ ] Every price in the generated build is verified against Supabase `listings` (no hallucinated prices).
  - [ ] Refinement action `"Upgrade GPU to RTX 4070"` replaces GPU, recalculates PSU requirement, and adjusts total price.
  - [ ] Incompatible retrieved parts trigger automatic fallback retry to next best candidate.
  - [ ] Session state is retrievable via `GET /api/ai/session/:id`.
- **Priority**: Critical
- **Status**: Not started

---

### 2.3 AI Service & Python Scraping Subsystem

#### [FastAPI AI Microservice Container]
- **Path**: `docker/ai/main.py`
- **Type**: FastAPI Microservice
- **Responsibility**: Lightweight HTTP service placeholder running on port 8000 inside Docker network, exposing health endpoints.
- **Depends on**: `fastapi`, `uvicorn`
- **Test type needed**: Integration / Unit
- **Key test cases**:
  - [ ] `GET /` returns `{ "message": "PCBuilder AI Recommendation Engine is running." }`.
  - [ ] `GET /health` returns `{ "status": "Healthy" }` with HTTP 200.
- **Priority**: Low (Placeholder — production logic is in `lib/ai/` and `scrapers/`)
- **Status**: Not started

#### [AI Web Snippet Extractor (Ollama + Groq)]
- **Path**: `scrapers/ai_extractor.py`
- **Type**: Python AI Module
- **Responsibility**: Parses raw HTML and search snippet text into structured JSON (`title`, `brand`, `price`, `stock`, `specs`, `product_url`) using local open model (Qwen 2.5 1.5B via Ollama `http://127.0.0.1:11434`) with cloud Groq API fallback.
- **Depends on**: `requests`, Ollama local daemon, Groq Cloud API
- **Test type needed**: Unit / Integration
- **Key test cases**:
  - [ ] Extracts clean numeric price from messy text (e.g. `"Special Price: ৳ 45,500 Regular: ৳ 48,000"` -> `45500`).
  - [ ] Accurately detects out-of-stock indicators (`"Out of Stock"`, `"Stock Out"`, `"Upcoming"`, `"Discontinued"`).
  - [ ] Local Ollama failure automatically triggers cloud Groq fallback without throwing unhandled exceptions.
  - [ ] Returns valid JSON matching expected schema.
- **Priority**: Critical
- **Status**: Not started

#### [Autonomous Multi-Engine Live Scanner]
- **Path**: `scrapers/google_live_scanner.py`
- **Type**: Python Search & Scraping Agent
- **Responsibility**: Autonomously queries Google, DuckDuckGo, and Bing search engines with browser TLS impersonation (`curl_cffi`), discovers all Bangladeshi retailer links stocking a component, and extracts real-time prices.
- **Depends on**: `curl_cffi`, `beautifulsoup4`, `scrapers/ai_extractor.py`, `scrapers/normalizer.py`
- **Test type needed**: Integration / E2E
- **Key test cases**:
  - [ ] Rotates search engines if one engine applies CAPTCHA / rate-limiting.
  - [ ] Bypasses Cloudflare anti-bot checks using `chrome120` TLS fingerprints.
  - [ ] Filters out non-Bangladeshi domains and irrelevant forum/blog links.
  - [ ] Aggregates retailer candidate links across StarTech, Ryans, Techland, Skyland, Potaka IT, etc.
- **Priority**: Critical
- **Status**: Not started

#### [Multi-Retailer Parallel Scraping Engine]
- **Path**: `scrapers/parallel_engine.py` & `fast_scrapers.py`
- **Type**: Python Scraping Engine
- **Responsibility**: High-concurrency multi-threaded scraping pipeline crawling 12+ Bangladeshi retailer catalogs with custom CSS selectors and headers.
- **Depends on**: `concurrent.futures`, `beautifulsoup4`, `curl_cffi`
- **Test type needed**: Integration / Regression
- **Key test cases**:
  - [ ] Successfully parses product grids across all 12 target stores:
    1. StarTech BD (`startech.com.bd`)
    2. Ryans Computers (`ryans.com`)
    3. Techland BD (`techlandbd.com`)
    4. Skyland BD (`skyland.com.bd`)
    5. PCB Store (`pcbstore.com.bd`)
    6. Potaka IT (`potakait.com`)
    7. Sell Tech BD (`selltech.com.bd`)
    8. Computer Village (`computervillage.com.bd`)
    9. PC House BD (`pchouse.com.bd`)
    10. Ultra Technology (`ultratech.com.bd`)
    11. Computer Mania BD (`computermania.com.bd`)
    12. Binary Logic (`binarylogic.com.bd`)
  - [ ] Handles HTTP 403 / 503 errors and network timeouts gracefully with retry loops.
- **Priority**: Critical
- **Status**: Not started

#### [Catalog Reconciliation & Deduplication Pipeline]
- **Path**: `scrapers/reconcile.py` & `scrapers/normalizer.py`
- **Type**: Python Data Processing Pipeline
- **Responsibility**: Merges scraped store listings with canonical database products, detects duplicate entries, updates lowest prices, and logs price change events for alert triggers.
- **Depends on**: `scrapers/db.py`, SQLite `pcbuilder.db`, Supabase
- **Test type needed**: Unit / Integration
- **Key test cases**:
  - [ ] Maps disparate store titles for the same hardware SKU to one canonical product ID.
  - [ ] Detects price drops (> 1%) and inserts records into `price_drop_events`.
  - [ ] Does not overwrite verified canonical specs with unverified scraped attributes.
- **Priority**: Critical
- **Status**: Not started

---

### 2.4 Cross-cutting / System

#### [Database Schema & Migrations]
- **Path**: `supabase/migrations/*.sql` (12 migration files)
- **Type**: Database Schema / DDL / RLS
- **Responsibility**: Defines database tables, constraints, foreign keys, indexes, triggers, and Row Level Security (RLS) policies across:
  - `profiles`: User account details, avatar, role.
  - `products`: Canonical hardware items and base specs.
  - `listings`: Live retailer store offers, prices, URLs, stock.
  - `product_specs`: Key-value structured hardware specifications.
  - `saved_builds`: User created and shared PC configurations.
  - `reviews`: Product reviews, ratings, verified buyer flags.
  - `price_alerts`: Active price drop alert thresholds and notification emails.
  - `price_history`: Chronological daily price logs per store.
  - `wishlists`: User favorited items.
  - `short_build_links`: 6-char short codes mapping to build JSON.
  - `ai_sessions`: Persisted Tonima AI multi-turn chat sessions.
- **Test type needed**: Migration / Data Integrity / RLS Security Audit
- **Key test cases**:
  - [ ] All migrations apply sequentially from empty database without errors.
  - [ ] Foreign key constraints enforce referential integrity (e.g. deleting product cascades to listings or sets null).
  - [ ] RLS policies prevent users from modifying or deleting other users' saved builds, reviews, or price alerts.
  - [ ] Indexes exist on high-frequency query columns (`listings.product_id`, `listings.title`, `products.category`, `price_alerts.user_id`).
- **Priority**: Critical
- **Status**: Not started

#### [Docker Compose & Container Networking]
- **Path**: `docker-compose.yml`, `docker-compose.override.yml`, `docker/*/Dockerfile`
- **Type**: Infrastructure / DevOps
- **Responsibility**: Multi-container container orchestration defining `db` (MySQL 8.0), `redis` (Redis 7 Alpine), `ai` (FastAPI service), `client` (React/Nginx frontend), and `nginx` gateway.
- **Test type needed**: Infrastructure / E2E
- **Key test cases**:
  - [ ] `docker compose up -d` boots all 5 containers into `pcbuilder_network` without crashing.
  - [ ] Container health checks pass for MySQL (`mysqladmin ping`) and Redis (`redis-cli ping`).
  - [ ] Environment variables (`GEMINI_API_KEY`, `DB_PASSWORD`, `SUPABASE_URL`) propagate correctly to containers.
  - [ ] Restart policy `always` recovers containers after simulated kill.
- **Priority**: High
- **Status**: Not started

#### [End-to-End Authentication Flow]
- **Path**: Full-stack (`client/src/auth` -> `server.js` -> Supabase Auth)
- **Type**: Security / E2E
- **Responsibility**: End-to-end user lifecycle: Registration -> Email Verification -> Login -> JWT issuance -> Authenticated API actions -> Session expiration & refresh -> Logout.
- **Test type needed**: E2E / Security
- **Key test cases**:
  - [ ] User cannot access `/profile` or submit reviews when unauthenticated.
  - [ ] Logging in issues valid JWT; client attaches token to subsequent API requests.
  - [ ] Modifying token payload triggers HTTP 401 on backend.
  - [ ] Logout invalidates client session and clears stored tokens.
- **Priority**: Critical
- **Status**: Not started

#### [Scraper & Ingestion Pipeline Integrity]
- **Path**: Full-stack (`scrapers/` -> `server.js` -> `supabase`)
- **Type**: Pipeline / Data Quality
- **Responsibility**: Periodic ingestion and live price refresh across 12 Bangladeshi computer hardware retailers.
- **Test type needed**: Integration / Data Accuracy / Chaos
- **Key test cases**:
  - [ ] Handles sudden retailer DOM structure changes without crashing crawler pipeline.
  - [ ] Stale price detection: flags listings not updated in > 7 days.
  - [ ] Zero price guard: prevents `৳0` or negative prices from polluting marketplace catalog.
- **Priority**: Critical
- **Status**: Not started

#### [Third-Party Integrations (Nodemailer, Groq, Ollama, Supabase Storage)]
- **Path**: `mailer.js`, `lib/groq.js`, `scrapers/ai_extractor.py`, `services/imageUpload.ts`
- **Type**: Integration / External APIs
- **Responsibility**: External service communication with fallback handling.
- **Test type needed**: Integration / Contract
- **Key test cases**:
  - [ ] SMTP service failure logs error without breaking calling HTTP request.
  - [ ] Groq API pool rate limit automatically triggers key rotation.
  - [ ] Ollama offline state fails over smoothly to Groq.
  - [ ] Image upload rejects files exceeding 15MB before hitting storage quota.
- **Priority**: High
- **Status**: Not started

---

## 3. Risk Matrix

| Module | Business Impact if it breaks | Likelihood of breaking | Priority (derived) |
|---|---|---|---|
| **Multi-Retailer Scraper Pipeline** (`scrapers/`) | **Catastrophic**: Stale or missing prices defeats PC Kinba's core value proposition. | **High**: Retailers frequently alter CSS selectors, HTML structure, or anti-bot rules. | **Critical** |
| **PC Builder & Compatibility Engine** (`compatibility.ts`, `useComponentStore`) | **Severe**: Incompatible PC recommendations lead to user purchasing wrong hardware. | **Medium**: Complex domain rules (sockets, RAM gen, PSU headroom, physical clearances). | **Critical** |
| **Search & Model Gating Engine** (`server.js`, `detectSearchIntent`) | **Severe**: Poor search relevance (e.g. showing laptops for GPU queries) ruins user trust. | **Medium**: Ambiguous search terms and varied hardware naming conventions. | **Critical** |
| **Tonima AI Build Pipeline** (`lib/ai/`) | **High**: Inaccurate AI build recommendations or hallucinated prices damages reputation. | **Medium**: Model drift, JSON schema violations, edge-case budget prompts. | **Critical** |
| **Auth & Protected User Data** (`AuthProvider`, `supabase/migrations/`) | **Severe**: Unauthorized access, data leakage of private builds/profiles. | **Low**: Handled primarily via Supabase Auth + RLS, but custom routes need auditing. | **Critical** |
| **Price Alert & Drop Dispatcher** (`server.js`, `mailer.js`) | **High**: Missed price drops degrades user engagement and loyalty. | **Medium**: SMTP delivery failures, cron scheduling errors, rate limits. | **High** |
| **Live Web Scraping Agent** (`scrapers/google_live_scanner.py`) | **High**: On-demand search fails when Google/Bing introduce CAPTCHAs. | **High**: Search engines actively combat automated web scrapers. | **High** |
| **Product Details & Price History** (`ProductDetailsPage.tsx`, `priceHistory.ts`) | **High**: Inaccurate price trends leads to faulty buy/wait recommendations. | **Low**: Pure database query + mathematical calculation. | **High** |
| **Multi-Store Basket Routing** (`BuildCheckoutPage.tsx`, `api/cart.ts`) | **Medium**: Sub-optimal retailer routing increases user delivery costs. | **Medium**: Heuristic combinatorial basket optimization. | **High** |
| **Dynamic OpenGraph Generator** (`server.js` `/api/builds/:code/og.png`) | **Medium**: Broken social previews degrades organic social sharing. | **Low**: Static image rendering via Sharp. | **Medium** |
| **Reviews & Community Library** (`ProductReviews`, `BuildLibraryPage.tsx`) | **Medium**: Spam or unverified reviews damages platform credibility. | **Medium**: Missing rate limits or unvalidated user inputs. | **Medium** |
| **3D Rig Viewers & Three.js Canvas** (`AssemblyScene.tsx`, `Chassis3DViewer.tsx`) | **Low**: Visual impairment only; core shopping/building functionality remains usable. | **Medium**: WebGL browser incompatibility or GPU memory overhead. | **Medium** |

---

## 4. Test Coverage Gaps

The following table lists discovered modules currently lacking automated unit, integration, or E2E test coverage, sorted by risk priority:

| Module | Location | Risk / Logic Description | Duplication / Architecture Note | Priority |
|---|---|---|---|---|
| **Hardware Compatibility Engine** | `client/src/components/builder/compatibility.ts` & `lib/ai/validator.js` | CPU socket, RAM gen, PSU wattage, cooler clearance logic. | **Duplication Risk**: Compatibility logic is duplicated across TypeScript frontend and Node.js backend. Must share canonical test fixtures. | **Critical** |
| **Search Intent & Model Gating** | `server.js:104` (`detectSearchIntent`) | Regex rules isolating exact model codes (`4060` vs `3060`) and category exclusions. | High risk of false positives/negatives in search results. | **Critical** |
| **Title Normalizer & Fingerprinting** | `lib/normalizer.js` & `scrapers/normalizer.py` | Title cleanup, brand detection, order-independent canonical fingerprint generation. | **Duplication Risk**: Implemented in both JavaScript (`lib/normalizer.js`) and Python (`scrapers/normalizer.py`). Output parity must be verified. | **Critical** |
| **AI Build Orchestrator & Validator** | `lib/ai/orchestrator.js`, `validator.js`, `intent.js` | Multi-step AI pipeline parsing natural language and constructing valid parts lists. | Complex asynchronous multi-LLM orchestration. | **Critical** |
| **Multi-Retailer Live Scraper** | `scrapers/fast_scrapers.py`, `google_live_scanner.py` | Web scraping parsers for 12 Bangladeshi computer stores. | External HTML structure changes can break price extraction without warning. | **Critical** |
| **Price Drop Alert Engine** | `server.js:1576` (`/api/price-alerts/process`) & `mailer.js` | Batch threshold checking, price drop event logging, email rendering and dispatch. | Untested email delivery and cron triggers. | **Critical** |
| **Global PC Builder Store** | `client/src/store/useComponentStore.ts` | Zustand state mutators: slot selection, price calculation, wattage draw, persistence. | Core client workflow state. | **Critical** |
| **Price Normalizer & Estimator** | `lib/priceEstimator.js` & `lib/normalizer.js` | Converts `"Call for Price"` / 0 to KNN/historical market estimates. | Risk of displaying unrealistic price estimates to users. | **High** |
| **Multi-Store Basket Optimizer** | `client/src/api/cart.ts` & `server.js:2044` | Groups parts by store and calculates optimal checkout route. | Direct financial calculation affecting checkout total. | **High** |
| **Groq Multi-Key Pool** | `lib/groq.js` | Key rotation, HTTP 429 backoff, fallback execution. | Potential failure point under heavy user traffic. | **High** |
| **Price Insights / Buy Signal** | `lib/priceInsights.js` | 30d/90d moving average calculation and `buy`/`fair`/`wait` signals. | Influences user purchase timing. | **High** |
| **Auth & Protected Route Guards** | `client/src/auth/ProtectedRoute.tsx` & Supabase RLS | Client route interception and database RLS security policies. | Security risk if unauthenticated users access private records. | **High** |

---

## 5. Recommended Tooling

### 5.1 Frontend Testing Stack
- **Unit & Component Testing**: `Vitest` + `@testing-library/react` + `@testing-library/user-event`
  - Ultra-fast execution sharing Vite configuration (`vite.config.ts`).
  - Fast DOM simulation via `happy-dom` or `jsdom`.
  - Mocking API network requests with `MSW` (Mock Service Worker).
- **End-to-End (E2E) Testing**: `Playwright`
  - Cross-browser automation (Chromium, Firefox, WebKit, Mobile Viewports).
  - Tests complete user journeys: Search -> Add to Builder -> Compatibility Check -> Share Build -> Profile.
  - Visual regression testing for 3D viewports and responsive layouts.

### 5.2 Backend Testing Stack
- **Unit & Integration Testing**: `Vitest` or `Jest` + `Supertest`
  - `Supertest` for testing Express HTTP endpoints without starting full server.
  - Mocking Supabase database queries via `@supabase/supabase-js` test client or in-memory SQLite / PostgreSQL test container.
  - Testing rate limiters, input sanitization, and error handling middleware.

### 5.3 AI & Python Scraping Subsystem Stack
- **Unit & Contract Testing**: `pytest` + `pytest-asyncio` + `httpx`
  - HTML fixtures from saved retailer pages to test CSS selectors and regex parsers offline.
  - Mocking LLM API calls with recorded responses.
  - Testing Ollama -> Groq failover chains.
- **Golden Evaluation Runner**: `tests/ai/eval_runner.js` + `tests/ai/golden.json`
  - Automated benchmark evaluating Tonima AI build generation against 20+ reference golden prompts.

---

## 6. Open Questions & Confirmation Items

The following items were flagged during the repository audit for confirmation by the development team (ArKo):

1. **AI Microservice Architecture (`docker/ai/main.py` vs `lib/ai/`)**:
   - `docker/ai/main.py` is currently an empty FastAPI placeholder with only `/` and `/health`, whereas the complete Tonima AI build pipeline is implemented in Node.js under `lib/ai/` (`orchestrator.js`, `intent.js`, `planner.js`, etc.).
   - *Question*: Is the Python FastAPI container intended to be deprecated/removed, or will heavy Python AI workloads (e.g. embeddings, local HuggingFace models) be migrated into it?

2. **Dual Database Usage (`pcbuilder.db` vs Supabase PostgreSQL)**:
   - Documentation references both a local SQLite database (`pcbuilder.db` used by scrapers) and cloud Supabase PostgreSQL.
   - *Question*: In production, is SQLite used strictly as an intermediate scraping scratchpad before syncing to Supabase, or is there a direct read replica setup?

3. **Duplicated Compatibility Rules**:
   - `client/src/components/builder/compatibility.ts` (TypeScript) and `lib/ai/validator.js` (JavaScript) contain duplicate compatibility logic.
   - *Question*: Should we extract these rules into a shared common package (`@pckinba/compatibility`) to prevent rule divergence?

---

*Report compiled by Senior QA Engineer for PC Kinba quality audit.*
