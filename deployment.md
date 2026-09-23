# PC-KINBA Production Deployment Guide

This guide provides complete, production-grade deployment instructions for **PC-KINBA** (Bangladesh's PC Component Price Comparison & Builder Platform).

---

## Table of Contents

1. [Deployment Architectures](#1-deployment-architectures)
   - [Option A: Decoupled Cloud (Vercel + Railway / Render + Supabase)](#option-a-decoupled-cloud-recommended-for-production)
   - [Option B: Unified Monolith (Single Container / Service)](#option-b-unified-monolith-single-service-or-docker)
   - [Option C: Self-Hosted Linux VPS (Ubuntu + PM2 + Nginx + SSL)](#option-c-self-hosted-linux-vps-ubuntu--pm2--nginx--certbot)
2. [Complete Environment Variables Reference](#2-complete-environment-variables-reference)
3. [Supabase Database & Authentication Setup](#3-supabase-database--authentication-setup)
4. [Deployment Target Walkthroughs](#4-deployment-target-walkthroughs)
   - [4.1 Backend on Railway](#41-backend-on-railway)
   - [4.2 Backend on Render (Alternative)](#42-backend-on-render-alternative)
   - [4.3 Frontend on Vercel](#43-frontend-on-vercel)
   - [4.4 Docker & Docker Compose Deployment](#44-docker--docker-compose-deployment)
   - [4.5 Self-Hosted Linux VPS with PM2 & Nginx](#45-self-hosted-linux-vps-with-pm2--nginx)
5. [Dynamic OpenGraph Meta Tags & Social Sharing (`/b/:code`)](#5-dynamic-opengraph-meta-tags--social-sharing-bcode)
6. [Background Jobs & Scraper Automation](#6-background-jobs--scraper-automation)
7. [Security Hardening & Best Practices](#7-security-hardening--best-practices)
8. [Pre-Deployment & Post-Deployment Verification](#8-pre-deployment--post-deployment-verification)
9. [Troubleshooting & Incident Runbook](#9-troubleshooting--incident-runbook)
10. [Production Launch Checklist](#10-production-launch-checklist)

---

## 1. Deployment Architectures

PC-KINBA supports two core deployment models depending on your infrastructure preferences:

### Option A: Decoupled Cloud (Recommended for Production)

```text
       ┌────────────────────────────────────────────────────────┐
       │                     End User Browser                   │
       └──────────────┬───────────────────────────┬─────────────┘
                      │ HTTPS                     │ HTTPS
                      ▼                           ▼
        ┌───────────────────────────┐   ┌───────────────────────────┐
        │       Vercel (Edge)       │   │    Railway / Render       │
        │   React 19 + Vite 8 SPA   │   │  Node.js 22 + Express API │
        └─────────────┬─────────────┘   └─────────────┬─────────────┘
                      │                               │
                      │ Auth / Direct Read            │ Queries / Mutations / RLS
                      ▼                               ▼
        ┌───────────────────────────────────────────────────────────┐
        │                  Supabase Cloud Platform                  │
        │   PostgreSQL 15+ | Supabase Auth | Storage | Realtime    │
        └─────────────────────────────┬─────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
        ┌──────────────┐                              ┌──────────────┐
        │  Brevo SMTP  │ (Transactional Emails)       │  AI Engines  │ (Gemini / Groq)
        └──────────────┘                              └──────────────┘
```

- **Frontend**: Hosted on **Vercel** with CDN caching, edge routing, and SPA rewrites (`client/vercel.json`).
- **Backend API**: Hosted on **Railway** or **Render** running `server.js` on Node.js 22+.
- **Database & Auth**: **Supabase** managed PostgreSQL with Row Level Security (RLS) and OAuth/Email auth.

### Option B: Unified Monolith (Single Service or Docker)

`server.js` includes built-in static asset serving and SPA fallback routing. When `client/dist` exists, `server.js` serves both the API endpoints (`/api/*`), social crawler preview tags (`/b/:code`), and the compiled React SPA on a single port:

```text
Browser ---> [ Railway / Render / VPS / Docker Container : PORT 3001 ]
                ├── /api/*          --> Express API Handlers
                ├── /b/:code        --> OpenGraph Dynamic Crawler HTML
                └── /* (Static/SPA) --> client/dist/index.html & assets
```

- **Pros**: Zero CORS configuration required, unified custom domain, single low-cost hosting plan.
- **Build command**: `npm run build:packages && npm --prefix client run build`
- **Start command**: `npm start`

---

## 2. Complete Environment Variables Reference

### Backend Environment Variables (`server.js` & `mailer.js`)

| Variable | Required? | Sensitive? | Default / Example | Purpose |
|---|---|---|---|---|
| `NODE_ENV` | **Yes** | No | `production` | Enables production optimizations and security behaviors. |
| `PORT` | Auto | No | `3001` | Server listen port. Injected automatically by Railway / Render. |
| `PUBLIC_APP_URL` | **Yes** | No | `https://pckinba.com` | Base URL of the deployed frontend. Used for CORS allowlist and email links. |
| `SUPABASE_URL` | **Yes** | No | `https://<ref>.supabase.co` | Supabase project REST URL. |
| `SUPABASE_PUBLISHABLE_KEY` | **Yes** | No | `sb_publishable_...` | Supabase anon/publishable key for client-level queries. |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | **HIGH** | `eyJhbGciOi...` | Supabase service-role secret. Required for price drop queue processing (`/api/price-alerts/process`). |
| `ADMIN_API_KEY` | Optional | **HIGH** | `random_long_secret_32_chars` | Secret key guarding `GET /api/admin/scraper-health` telemetry. |
| `BREVO_SMTP_HOST` | Optional | No | `smtp-relay.brevo.com` | SMTP host for email alerts (Brevo). |
| `BREVO_SMTP_PORT` | Optional | No | `587` | SMTP port (typically `587` for TLS or `465` for SSL). |
| `BREVO_SMTP_USER` | Optional | **HIGH** | `7a8b9c...@smtp-brevo.com` | Brevo SMTP login account. |
| `BREVO_SMTP_PASS` | Optional | **HIGH** | `xsmtpsib-...` | Brevo SMTP master master key. |
| `EMAIL_FROM` | Optional | No | `PC Kinba <notifications@pckinba.com>` | Verified sender address in Brevo. |
| `GEMINI_API_KEY` | Optional | **HIGH** | `AIzaSy...` | Google Gemini API key for AI assistant features. |
| `GROQ_API_KEYS` | Optional | **HIGH** | `gsk_key1,gsk_key2` | Comma-separated Groq API keys for high-speed LLM inferences. |
| `OPENAI_API_KEY` | Optional | **HIGH** | `sk-...` | OpenAI API key for fallback AI completions. |
| `IMAGEKIT_PUBLIC_KEY` | Optional | No | `public_...` | ImageKit public key for media storage. |
| `IMAGEKIT_PRIVATE_KEY` | Optional | **HIGH** | `private_...` | ImageKit private key for backend signature generation. |
| `IMAGEKIT_URL_ENDPOINT` | Optional | No | `https://ik.imagekit.io/<id>` | ImageKit CDN endpoint URL. |

> [!CAUTION]
> **Never** expose `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_KEY`, `BREVO_SMTP_PASS`, or `IMAGEKIT_PRIVATE_KEY` to the client-side bundle or Vercel `VITE_*` environment variables.

---

### Frontend Environment Variables (`client/`)

Vite requires client-accessible variables to be prefixed with `VITE_`. These are compiled into static JS at build time:

| Variable | Required? | Sensitive? | Default / Example | Purpose |
|---|---|---|---|---|
| `VITE_API_URL` | **Yes** (Decoupled) | No | `https://api.pckinba.com/api` | Base API URL pointing to the Node.js backend. Must include `/api`. Leave empty for Unified Monolith mode. |
| `VITE_SUPABASE_URL` | **Yes** | No | `https://<ref>.supabase.co` | Supabase URL for client-side Auth and direct catalog subscriptions. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | No | `sb_publishable_...` | Supabase Anon/Publishable Key (safe for public exposure). |
| `VITE_IMAGEKIT_PUBLIC_KEY` | Optional | No | `public_...` | ImageKit public key for client-side avatar/image upload widget. |
| `VITE_IMAGEKIT_URL_ENDPOINT` | Optional | No | `https://ik.imagekit.io/<id>` | ImageKit CDN endpoint for image transformations. |

---

## 3. Supabase Database & Authentication Setup

### 3.1 Create and Link the Supabase Project

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project (e.g. `pc-kinba-prod`, Region: `Singapore (ap-southeast-1)` or closest to Bangladesh).
2. Note your **Project Reference ID** (e.g., `jkooxrfapqvwmoygswjv`), **Project URL**, and API Keys from **Settings > API**:
   - `anon` / `publishable` key (for frontend & public backend requests)
   - `service_role` key (for backend admin triggers and background workers)

### 3.2 Apply Database Migrations

Apply the migration files located in `supabase/migrations/`:

#### Option 1: Supabase CLI (Recommended)

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Authenticate
supabase login

# 3. Link your remote project
supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>

# 4. Push migrations to remote database
supabase db push
```

#### Option 2: Supabase Dashboard SQL Editor

If you prefer applying via the Web UI:
1. Open **Supabase Dashboard > SQL Editor**.
2. Run the migration files in `supabase/migrations/` in chronological timestamp order:
   - `20250218000001_phase1_consolidated_schema.sql`
   - `20250220000000_seed_core_catalog.sql`
   - `20250224000000_phase2_compat_parity.sql`
   - `20250226000000_scraper_health_schema.sql`
   - `20250228000000_add_missing_indexes.sql`
   - `20250301000000_price_alerts_email_system.sql`
   - `20250302000000_add_builder_indexes.sql`
3. Verify that all tables are created successfully:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

### 3.3 Configure Authentication & Redirect URLs

In the Supabase Dashboard, navigate to **Authentication > URL Configuration**:

- **Site URL**: `https://pckinba.com` (or your production Vercel domain `https://<your-project>.vercel.app`)
- **Redirect URLs (Allowlist)**:
  - `https://pckinba.com/**`
  - `https://*.vercel.app/**` (for preview branches)
  - `http://localhost:5173/**` (for local development)
  - `http://localhost:3001/**`

---

## 4. Deployment Target Walkthroughs

### 4.1 Backend on Railway

Railway is the primary recommended platform for hosting the Node.js API.

1. **Create New Project**:
   - Go to [Railway.app](https://railway.app) > **New Project** > **Deploy from GitHub repo**.
   - Select your `PC-KINBA` repository and branch (`main`).
2. **Service Root & Build Settings**:
   - Under **Service Settings**:
     - **Root Directory**: `/` (Leave as repository root).
     - **Build Command**: `npm ci && npm run build:packages`
     - **Start Command**: `npm start`
3. **Environment Variables**:
   - In the **Variables** tab, add:
     ```ini
     NODE_ENV=production
     PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
     SUPABASE_URL=https://<project-ref>.supabase.co
     SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
     SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
     ADMIN_API_KEY=<generate-a-secure-random-token>
     BREVO_SMTP_HOST=smtp-relay.brevo.com
     BREVO_SMTP_PORT=587
     BREVO_SMTP_USER=<your-brevo-user>
     BREVO_SMTP_PASS=<your-brevo-password>
     EMAIL_FROM=PC Kinba <notifications@pckinba.com>
     GEMINI_API_KEY=<your-gemini-key>
     GROQ_API_KEYS=<your-groq-key>
     IMAGEKIT_PUBLIC_KEY=<your-imagekit-public-key>
     IMAGEKIT_PRIVATE_KEY=<your-imagekit-private-key>
     IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>
     ```
4. **Networking & Custom Domain**:
   - Under **Networking**, click **Generate Domain** (e.g. `pc-kinba-api.up.railway.app`) or attach your custom API domain (e.g. `api.pckinba.com`).
5. **Verify API Health**:
   ```bash
   curl -i https://pc-kinba-api.up.railway.app/
   # Response should be: {"status":"healthy","service":"PC Kinba Backend API",...}
   ```

---

### 4.2 Backend on Render (Alternative)

If using Render Web Services:

1. Create a **Web Service** connected to your GitHub repository.
2. Configure settings:
   - **Environment**: `Node`
   - **Node Version**: `22.x` (Add environment variable `NODE_VERSION=22.12.0`)
   - **Build Command**: `npm ci && npm run build:packages`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/`
3. Add the same environment variables listed in the Railway section.

---

### 4.3 Frontend on Vercel

Vercel hosts the React 19 + Vite 8 SPA.

1. **Import Project**:
   - Go to [Vercel](https://vercel.com) > **Add New Project** > Import `PC-KINBA`.
2. **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build & Development Settings**:
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
3. **Environment Variables**:
   - Add the following variables to **Production** and **Preview**:
     ```ini
     VITE_SUPABASE_URL=https://<project-ref>.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
     VITE_API_URL=https://pc-kinba-api.up.railway.app/api
     ```
     *(Make sure `VITE_API_URL` ends with `/api` and has no trailing slash!)*
4. **SPA Rewrite & Asset Caching**:
   - The repository includes [`client/vercel.json`](file:///media/arkosaha/Volume13/SD%20PROJECT/PC-KINBA/client/vercel.json) to handle SPA routing fallbacks (`/(.*) -> /index.html`) and cache static assets:
     ```json
     {
       "$schema": "https://openapi.vercel.sh/vercel.json",
       "rewrites": [
         { "source": "/(.*)", "destination": "/index.html" }
       ],
       "headers": [
         {
           "source": "/assets/(.*)",
           "headers": [
             { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
           ]
         }
       ]
     }
     ```
5. **Deploy**:
   - Click **Deploy**.
   - Test deep routes such as `https://<your-vercel-domain>.vercel.app/compare` to ensure SPA rewrites work.

---

### 4.4 Docker & Docker Compose Deployment

The repository includes a multi-stage, production-hardened [`Dockerfile`](file:///media/arkosaha/Volume13/SD%20PROJECT/PC-KINBA/Dockerfile) in the root directory that compiles the workspace package, builds the frontend SPA, and packages the Node.js backend.

#### Build and Run with Docker CLI

```bash
# 1. Build the production image
docker build -t pc-kinba:latest .

# 2. Run the container
docker run -d \
  --name pc-kinba-app \
  -p 3001:3001 \
  --env-file .env.production \
  --restart unless-stopped \
  pc-kinba:latest

# 3. Check health and logs
docker ps
docker logs -f pc-kinba-app
```

#### Production Docker Compose (`docker-compose.prod.yml`)

Create a production compose file for running the full unified application:

```yaml
version: "3.8"

services:
  app:
    container_name: pc-kinba-prod
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - PUBLIC_APP_URL=${PUBLIC_APP_URL:-https://pckinba.com}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ADMIN_API_KEY=${ADMIN_API_KEY}
      - BREVO_SMTP_HOST=${BREVO_SMTP_HOST:-smtp-relay.brevo.com}
      - BREVO_SMTP_PORT=${BREVO_SMTP_PORT:-587}
      - BREVO_SMTP_USER=${BREVO_SMTP_USER}
      - BREVO_SMTP_PASS=${BREVO_SMTP_PASS}
      - EMAIL_FROM=${EMAIL_FROM}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GROQ_API_KEYS=${GROQ_API_KEYS}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Run with:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

### 4.5 Self-Hosted Linux VPS (Ubuntu + PM2 + Nginx + Certbot)

For deploying on a standard VPS (DigitalOcean Droplet, Hetzner, Linode, AWS EC2, etc.):

#### Step 1: Install Node.js 22, Git & Build Essentials

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx build-essential

# Install PM2 process manager globally
sudo npm install -g pm2
```

#### Step 2: Clone and Build Application

```bash
# Clone repository
sudo mkdir -p /var/www/pc-kinba
sudo chown -R $USER:$USER /var/www/pc-kinba
git clone https://github.com/ArKoSaHa-AUST/Pc-KINBA.git /var/www/pc-kinba
cd /var/www/pc-kinba

# Install dependencies and build shared packages + frontend
npm ci
npm run build:packages
cd client && npm ci && npm run build && cd ..

# Setup production environment variables
cp .env.example .env
nano .env  # Fill in production Supabase, Brevo, and AI credentials
```

#### Step 3: Manage with PM2

Start the application with PM2 cluster / fork mode:

```bash
# Start backend server
pm2 start server.js --name "pc-kinba-backend" --time

# Save PM2 process list and configure auto-start on boot
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx as Reverse Proxy

Create `/etc/nginx/sites-available/pckinba.com`:

```nginx
server {
    listen 80;
    server_name pckinba.com www.pckinba.com;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Static assets caching
    location /assets/ {
        alias /var/www/pc-kinba/client/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # OpenGraph dynamic social preview links for PC builds
    location ~* ^/b/[0-9a-fA-F]+$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # React SPA Frontend Fallback
    location / {
        root /var/www/pc-kinba/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/pckinba.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 5: Secure with Free Let's Encrypt SSL

```bash
sudo certbot --nginx -d pckinba.com -d www.pckinba.com --non-interactive --agree-tos -m admin@pckinba.com
```

---

## 5. Dynamic OpenGraph Meta Tags & Social Sharing (`/b/:code`)

PC-KINBA supports rich shareable build URLs (e.g. `https://pckinba.com/b/a1b2c3d`).

### Why It Matters:
When a user shares a PC build link on **Facebook, Discord, WhatsApp, Twitter/X, or Telegram**, social scrapers request the URL without executing JavaScript.

- `server.js` contains a dedicated endpoint: `GET /b/:code`.
- It fetches the build components from Supabase, constructs an SVG preview card (`/api/builds/:code/og.png`), and renders full HTML `<meta property="og:...">` tags.
- Human users are automatically redirected to the full interactive client builder SPA.

### Routing Rule:
If using a CDN / Nginx / Reverse Proxy in front of PC-KINBA, ensure requests matching `^/b/[0-9a-fA-F]+$` are forwarded directly to the Node.js backend.

---

## 6. Background Jobs & Scraper Automation

### 6.1 Retailer Scraper Health Canary (Automated)

The repository includes a GitHub Actions workflow in [`.github/workflows/scraper-health.yml`](file:///media/arkosaha/Volume13/SD%20PROJECT/PC-KINBA/.github/workflows/scraper-health.yml) that executes every 6 hours (`0 */6 * * *`):
- Runs parser unit tests (`pytest tests/scrapers/`).
- Performs live canary queries against all 12 supported Bangladeshi tech retailers without modifying catalog rows.
- Records health telemetry to the Supabase `scraper_health` table.
- Emits GitHub CI annotations if 3+ consecutive store failures are detected.

### 6.2 Price Drop Email Queue Processing

When prices drop on tracked components, a PostgreSQL trigger inserts rows into `price_drop_events`.

To process this queue automatically:
1. Trigger the endpoint periodically via an external cron service (e.g., [Cron-Job.org](https://cron-job.org), GitHub Actions cron, or Linux crontab):
   ```bash
   curl -X POST https://api.pckinba.com/api/price-alerts/process \
     -H "Authorization: Bearer <ADMIN_API_KEY>"
   ```
2. Or configure a cron job on your VPS / worker instance:
   ```cron
   # Run price drop processor every 15 minutes
   */15 * * * * curl -s -X POST http://localhost:3001/api/price-alerts/process > /dev/null 2>&1
   ```

### 6.3 Periodic Full Catalog Ingestion

To run full catalog synchronization across all 12 retailers:
```bash
# Using Python ingestion engine
python -m scrapers.run_scrapers --concurrency 4

# Or using the Node synchronization script
node scripts/sync_retailer_catalog.js
```

---

## 7. Security Hardening & Best Practices

1. **Enforce Row Level Security (RLS)**:
   Ensure all user-specific tables have RLS enabled. Run this verification in Supabase SQL editor:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```
2. **Strict CORS Policy**:
   In `server.js`, configure CORS to only allow your verified frontend domains:
   ```js
   const allowedOrigins = [
     process.env.PUBLIC_APP_URL,
     "https://pckinba.com",
     "https://www.pckinba.com"
   ].filter(Boolean);

   app.use(cors({
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error("Not allowed by CORS"));
       }
     },
     credentials: false
   }));
   ```
3. **Protect Admin Endpoints**:
   Always set a strong random `ADMIN_API_KEY` (32+ alphanumeric characters) in your production backend environment.
4. **Rate Limiting**:
   `server.js` applies `express-rate-limit` to both standard read queries (`apiLimiter`: 120 req/min) and heavyweight scraper/AI operations (`commandLimiter`: 15 req/min).

---

## 8. Pre-Deployment & Post-Deployment Verification

### 8.1 Local Pre-Flight Check

Run these checks from the repository root before pushing:

```bash
# 1. Clean install root dependencies
npm ci

# 2. Build shared workspace package
npm run build:packages

# 3. Lint and build frontend client
npm --prefix client ci
npm --prefix client run lint
npm --prefix client run build

# 4. Run backend integration & parity tests
npm test

# 5. Run Python scraper tests
pytest tests/scrapers/
```

### 8.2 Live Post-Deployment Smoke Test

Execute this sequence of verification curl tests against your deployed API:

```bash
API_URL="https://pc-kinba-api.up.railway.app"

# 1. Root health check
curl -f -s "${API_URL}/" | jq .

# 2. Catalog categories endpoint
curl -f -s "${API_URL}/api/categories" | jq .

# 3. Product search endpoint
curl -f -s "${API_URL}/api/search?q=RTX%204060" | jq '.results | length'

# 4. Filter parameters endpoint
curl -f -s "${API_URL}/api/filters" | jq .

# 5. Builder catalog endpoint
curl -f -s "${API_URL}/api/builder/catalog?category=gpu" | jq '.products | length'

# 6. Admin scraper health telemetry (with admin key)
curl -f -s "${API_URL}/api/admin/scraper-health" \
  -H "x-admin-key: <YOUR_ADMIN_API_KEY>" | jq .
```

---

## 9. Troubleshooting & Incident Runbook

### Issue 1: Frontend displays Network Error / Failed to Fetch
- **Cause**: `VITE_API_URL` is unset, points to `localhost`, or is missing `/api`.
- **Fix**: Set `VITE_API_URL=https://<your-backend-domain>/api` in Vercel settings and trigger a redeploy. Remember that Vite variables are compiled at build time.

### Issue 2: Direct Page Refresh gives 404 on Vercel
- **Cause**: Vercel is attempting to locate a static file matching the route instead of falling back to `index.html`.
- **Fix**: Confirm [`client/vercel.json`](file:///media/arkosaha/Volume13/SD%20PROJECT/PC-KINBA/client/vercel.json) is present in the `client/` folder with the rewrite rule to `/index.html`.

### Issue 3: Railway Build fails on `@pc-kinba/compat-rules`
- **Cause**: Railway attempted to build `client/` without first building the shared workspace package.
- **Fix**: Ensure Railway Root Directory is `/` and the build command is `npm ci && npm run build:packages`.

### Issue 4: Supabase RLS Permission Denied (`42501`)
- **Cause**: Table RLS policies do not permit the authenticated user's role or the operation.
- **Fix**: Inspect Supabase Dashboard > Authentication > Policies. Do not bypass security by using the `service_role` key in frontend code.

### Issue 5: Brevo SMTP Email Fails with Connection Error
- **Cause**: Port `25` or `465` blocked by cloud provider, or unverified sender address.
- **Fix**: Use port `587` with TLS, verify `BREVO_SMTP_USER` and `BREVO_SMTP_PASS`, and ensure `EMAIL_FROM` matches a sender verified in Brevo.

---

## 10. Production Launch Checklist

Print or verify this checklist before opening traffic to public users:

- [ ] **Supabase Setup**:
  - [ ] Project created in closest region to target users.
  - [ ] All migrations applied (`supabase db push` or SQL Editor).
  - [ ] Row Level Security (RLS) enabled and verified on all public tables.
  - [ ] Auth Site URL and Redirect URLs configured.
- [ ] **Backend Deployment (Railway / Render / VPS)**:
  - [ ] Node.js version 22+ active.
  - [ ] Workspace package build command verified (`npm ci && npm run build:packages`).
  - [ ] Production environment variables populated (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
  - [ ] `ADMIN_API_KEY` set to strong random string.
  - [ ] Health check responding 200 OK on `/`.
- [ ] **Frontend Deployment (Vercel / Nginx)**:
  - [ ] `VITE_API_URL` points to production backend and includes `/api`.
  - [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configured.
  - [ ] `vercel.json` SPA rewrite rule active and tested on deep URLs (`/compare`, `/builder`).
- [ ] **Integration & Third-Party Services**:
  - [ ] Brevo SMTP tested with welcome/price alert email.
  - [ ] Gemini / Groq AI API keys verified.
  - [ ] ImageKit credentials active (if uploads enabled).
- [ ] **Automation & Monitoring**:
  - [ ] Scraper health canary GitHub Action scheduled.
  - [ ] Price drop queue processor scheduled via cron.
  - [ ] All test/staging credentials rotated.
