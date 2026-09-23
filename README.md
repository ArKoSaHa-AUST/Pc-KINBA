<div align="center">

# 🖥️ PC-KINBA (পিসি কিনবা)

### *Intelligent PC Builder, Real-Time Multi-Retailer Price Comparison & Hardware Compatibility Platform for Bangladesh*

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-v8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-supported-retailers">Retailers</a> •
  <a href="#-testing--quality-assurance">Testing</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## 📌 Overview

**PC-KINBA** solves the massive fragmentation in Bangladesh's PC hardware market. When buying computer components in Bangladesh, consumers are forced to manually scour dozens of disparate e-commerce storefronts with volatile pricing, inconsistent naming, varying warranty terms, and unannounced stock changes.

**PC-KINBA** unifies the entire ecosystem into a single high-performance platform:
- **Universal Hardware Catalog**: Clean, canonical, deduplicated component specifications.
- **12-Retailer Live Price Tracker**: Automated pricing and stock monitoring across Star Tech, Ryans, Tech Land, Skyland, and more.
- **Intelligent 3D PC Builder**: Real-time compatibility engine (sockets, TDP, RAM generation, physical dimensions) with interactive 3D assembly.
- **Tonima AI Advisor**: Bilingual conversational AI hardware consultant (English & বাংলা) for budget allocation and bottleneck diagnostics.
- **Multi-Store Basket Optimization**: Calculates the lowest-cost split basket across multiple stores to maximize savings in Bangladeshi Taka (৳ / BDT).

---

## ✨ Key Features

| Feature | Description |
|---|---|
| ⚡ **Live Multi-Retailer Price Comparison** | Real-time prices, stock status (`In Stock`, `Out of Stock`, `Call for Price`), and historical price charts across 12 top Bangladeshi stores. |
| 🛠️ **Compatibility Auditor (`@pc-kinba/compat-rules`)** | Monorepo-shared rule engine validating CPU sockets (LGA1700, AM5, AM4), DDR4/DDR5 RAM, motherboard form factors, PSU wattage headroom, and GPU casing clearance. |
| 🧊 **Interactive 3D Assembly View** | Holographic 3D PC case visualization built with **Three.js** and **React Three Fiber** illustrating part placement and aesthetic synergy. |
| 🤖 **Tonima AI Hardware Advisor** | Natural language hardware consultant powered by **Google Gemini** & **Groq LLM pools** that designs builds based on user budget, intent, and gaming/workstation archetypes. |
| 🛒 **Smart Multi-Store Basket Router** | Intelligent routing algorithm that groups selected PC parts to find either the single cheapest store or the optimal multi-store combination. |
| 🔔 **Price Drop Alerts & Email Dispatch** | PostgreSQL trigger-based event pipeline dispatching transactional email notifications via **Brevo SMTP** when tracked component prices drop. |
| 🔗 **Dynamic OpenGraph Build Previews (`/b/:code`)** | Server-side rendered social preview cards displaying component lists, total cost, and custom preview graphics on Facebook, Discord, WhatsApp, and Twitter/X. |
| 🌐 **Bilingual (English & বাংলা)** | Seamless dynamic localization with native BDT (`৳`) pricing, English/Bengali search queries, and localized component terminology. |

---

## 🏗️ System Architecture

```text
                               ┌─────────────────────────────────────────┐
                               │            End User Browser             │
                               └───────────┬─────────────────┬───────────┘
                                           │                 │
                           React 19 (SPA)  │                 │ Direct Auth / Subscriptions
                                           ▼                 ▼
             ┌─────────────────────────────────────────┐   ┌───────────────────────────┐
             │       Frontend Client (Vite 8 SPA)      │   │       Supabase Auth       │
             │   - React Three Fiber (3D Rig View)     │   │   - JWT Session Tokens    │
             │   - Tailwind CSS v4 & Framer Motion     │   │   - OAuth / Magic Links   │
             │   - i18next Localization (EN / BN)      │   └─────────────┬─────────────┘
             └────────────────────┬────────────────────┘                 │
                                  │ HTTPS API Requests                   │
                                  ▼                                      │
             ┌─────────────────────────────────────────┐                 │
             │        Node.js 22 Express API Server    │                 │
             │   - REST API Endpoints (/api/*)         │                 │
             │   - OpenGraph Dynamic Metadata (/b/*)   │                 │
             │   - Search Intent & Token Normalizer    │                 │
             │   - Rate Limiting & Security Filters    │                 │
             └────────────────────┬────────────────────┘                 │
                                  │                                      │
               ┌──────────────────┼──────────────────┐                   │
               │ PostgreSQL (RLS) │ Query Data       │ Event Queue       │
               ▼                  ▼                  ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Supabase Cloud Platform                            │
│  - Products, Listings & Categories      - User Profiles, Saved Builds & Cart │
│  - Price History & Realtime Snapshots   - Scraper Health & Run Telemetry     │
│  - DB Trigger -> Price Drop Events Queue                                     │
└──────────────────────┬───────────────────────────────────────────────┬───────┘
                       │                                               │
                       ▼                                               ▼
        ┌──────────────────────────────┐                ┌──────────────────────────────┐
        │       AI Engine Pools        │                │    Scraper & Health Canary   │
        │ - Google Gemini (Tonima AI)  │                │ - 12 Store Parsers (Python)  │
        │ - Groq Multi-Key Fallback    │                │ - curl_cffi TLS Impersonate  │
        │ - Ollama Local Extraction    │                │ - GitHub Actions 6-Hour Cron │
        └──────────────────────────────┘                └──────────────────────────────┘
```

---

## 📂 Repository Structure

```text
PC-KINBA/
├── client/                     # React 19 + TypeScript + Vite 8 frontend application
│   ├── src/
│   │   ├── api/                # Typed REST client & Supabase API handlers
│   │   ├── auth/               # Supabase AuthProvider, context & protected routes
│   │   ├── components/         # UI components (Builder, Compare, 3D Canvas, Reviews)
│   │   ├── hooks/              # Custom React hooks (speech-to-text, audio, filters)
│   │   ├── i18n/               # Localization dictionaries (English & Bengali)
│   │   └── store/              # Zustand state stores (build, compare, cart)
│   ├── vercel.json             # Vercel SPA routing rewrites & static asset caching
│   └── vite.config.ts          # Vite build configuration & LAN proxy
├── packages/
│   └── compat-rules/           # Shared isomorphic hardware compatibility rules package
│       └── src/                # Socket, TDP, DDR, RAM & dimension validation logic
├── lib/
│   └── ai/                     # AI orchestration (Tonima AI, Groq client, intent parser)
├── scrapers/                   # High-performance Python scrapers for BD retailers
│   ├── selectors.py            # Centralized CSS selector registry for all 12 stores
│   ├── fast_scrapers.py        # curl_cffi TLS-impersonated scrapers & parsers
│   ├── health.py               # Rolling-median anomaly detection & state machine
│   └── smoke_test.py           # Canary runner for scheduled health audits
├── supabase/
│   └── migrations/             # Timestamped SQL migrations (PostgreSQL DDL & RLS)
├── tests/                      # Comprehensive Vitest & Pytest test suites
│   ├── backend/                # API endpoints, search intent, normalizer & AI tests
│   ├── frontend/               # Component, store, and UI unit tests
│   └── scrapers/               # Golden HTML parser regression fixtures & unit tests
├── .github/workflows/          # CI/CD pipelines (Tests, Scraper Health, Releases)
├── Dockerfile                  # Multi-stage production Node.js 22 container manifest
├── docker-compose.yml          # Local and production multi-container configuration
├── server.js                   # Node.js + Express primary backend API server
├── mailer.js                   # Nodemailer + Brevo SMTP email delivery engine
├── deployment.md               # Complete production deployment & operations guide
└── package.json                # Root npm workspace manifest
```

---

## 🏬 Supported Retailers

PC-KINBA continuously indexes and tracks hardware prices across **12 leading technology retailers in Bangladesh**:

| Retailer | Store Code | Parser Engine | Platform Base |
|---|---|---|---|
| **Star Tech BD** | `startech` | `fast_scrapers.py` | Custom PHP |
| **Ryans Computers** | `ryans` | `fast_scrapers.py` | Custom SPA / API |
| **Tech Land BD** | `techland` | `fast_scrapers.py` | Custom E-Commerce |
| **Skyland BD** | `skyland` | `fast_scrapers.py` | OpenCart |
| **PCB Store** | `pcbstore` | `fast_scrapers.py` | Custom |
| **Computer Mania BD** | `computermania` | `fast_scrapers.py` | WooCommerce |
| **Binary Logic** | `binarylogic` | `fast_scrapers.py` | Custom |
| **Sell Tech BD** | `selltech` | `fast_scrapers.py` | OpenCart |
| **Computer Village** | `computervillage` | `fast_scrapers.py` | OpenCart |
| **PC House BD** | `pchouse` | `fast_scrapers.py` | Custom |
| **Ultra Technology** | `ultratech` | `fast_scrapers.py` | OpenCart |
| **Global Brand** | `globalbrand` | `fast_scrapers.py` | OpenCart |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v22.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Python**: `3.10+` (for scraper modules and Python tests)
- **Supabase Account**: (Free tier or self-hosted PostgreSQL)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ArKoSaHa-AUST/Pc-KINBA.git
cd PC-KINBA

# Install root & workspace dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment Variables

Create `.env` in the root directory:

```bash
cp .env.example .env
```

Fill in your configuration keys:

```ini
# Application
NODE_ENV=development
PORT=3001
PUBLIC_APP_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# AI Integrations (Optional)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEYS=gsk_key1,gsk_key2

# Email & Notifications (Optional)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_user
BREVO_SMTP_PASS=your_brevo_password
EMAIL_FROM="PC Kinba <notifications@pckinba.com>"
```

And configure `client/.env.local` for the frontend:

```ini
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

### 3. Build Shared Packages & Run Database Migrations

```bash
# Compile shared compatibility package
npm run build:packages

# Apply Supabase database schema
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

### 4. Start Development Servers

You can start both backend and frontend concurrently:

```bash
# Terminal 1: Backend Express API (Port 3001)
npm run dev:server

# Terminal 2: Frontend Vite Client (Port 5173)
npm run client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker Deployment

PC-KINBA includes a production-ready, multi-stage [`Dockerfile`](Dockerfile):

```bash
# Build the production container
docker build -t pc-kinba:latest .

# Run the unified container (serves API + built React SPA on port 3001)
docker run -d \
  --name pc-kinba-app \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  pc-kinba:latest
```

---

## 🧪 Testing & Quality Assurance

The codebase maintains strict automated test coverage across frontend components, backend APIs, compatibility validation, and retailer scraping algorithms:

```bash
# Run all Vitest unit and integration suites (240+ tests)
npm test

# Run client-specific component tests
npm --prefix client test

# Run Python scraper parser tests against golden HTML fixtures
python -m pytest tests/scrapers/

# Run scraper canary smoke test (without catalog mutation)
python -m scrapers.smoke_test --dry-run --query "rtx 4060"
```

---

## 🌐 Production Deployment

For complete, step-by-step production setup across different hosting platforms, see our [**Deployment Guide (`deployment.md`)**](deployment.md):

- **[Vercel + Railway Decoupled Topology](deployment.md#41-backend-on-railway)** (Recommended)
- **[Render Cloud Hosting](deployment.md#42-backend-on-render-alternative)**
- **[Unified Monolith Single-Service Hosting](deployment.md#option-b-unified-monolith-single-service-or-docker)**
- **[Self-Hosted Ubuntu VPS with PM2, Nginx & Certbot SSL](deployment.md#45-self-hosted-linux-vps-with-pm2--nginx)**
- **[OpenGraph Social Preview Configuration (`/b/:code`)](deployment.md#5-dynamic-opengraph-meta-tags--social-sharing-bcode)**

---

## 🤝 Contributing

We welcome contributions from the community! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass (`npm test` and `npm --prefix client run lint`).
4. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add support for new retailer'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

Please read our [**Contributing Guidelines**](CONTRIBUTING.md) and [**Security Policy**](SECURITY.md) for more details.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ for the PC enthusiast and gaming community of Bangladesh 🇧🇩</sub>
</div>
