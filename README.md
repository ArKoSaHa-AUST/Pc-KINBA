# PCBuilder Bangladesh - Production-Ready Dockerized E-Commerce & AI Platform

PCBuilder Bangladesh is a full-stack, enterprise-grade web application similar to **PCPartPicker**, built specifically for the Bangladesh PC hardware market. It features live multi-seller price comparisons, an AI-powered PC build recommendation generator, real-time compatibility auditing, and custom build sharing.

> **Backend Status:** The backend is being migrated to **Laravel (PHP + MySQL)**. The `server/` directory is currently empty and ready for a fresh Laravel installation. The React frontend and AI service are fully in place.

---

## 1. Project Architecture

The application follows a layered architecture with a Laravel REST API backend and a React SPA frontend.

```
                  +-----------------------------------+
                  |      React SPA (Vite / TS)        |
                  +-----------------------------------+
                                    |
                                    v (HTTP / REST APIs)
                  +-----------------------------------+
                  |     Laravel API (PHP 8.2+)        |
                  +-----------------------------------+
                    |             |                 |
                    v             v                 v
            +---------------+ +---------------+ +---------------+
            |  Eloquent ORM | | Sanctum/Auth  | | AI / Scrapers |
            |    (MySQL)    | |    (JWT)       | |  (Services)   |
            +---------------+ +---------------+ +---------------+
                    \             |                 /
                     \            v                /
                      +---------------------------+
                      |     Domain Models/Rules   |
                      +---------------------------+
```

---

## 2. Directory Layout

The workspace is organized into logical folders separating UI, backend, docker configurations, and management tools:

```
PCBuilder/
├── assets/                  # Logos and static documentation assets
├── client/                  # React + TypeScript Vite application
├── docker/                  # Containership manifests (Dockerfiles)
│   ├── client/              # React SPA Dockerfile + Prod Nginx serve config
│   ├── nginx/               # Reverse proxy config & routing rules
│   └── ai/                  # AI Python service Dockerfile placeholder
├── docs/                    # Architectural Decision Records (ADRs)
├── scripts/                 # Cross-platform startup and housekeeping scripts
├── server/                  # Laravel backend (to be initialized)
├── client-build.sh          # Local client compiler Docker wrapper
├── client-dev.sh            # Local client dev server Docker wrapper
├── docker-compose.yml       # Production-like container configuration
├── docker-compose.override.yml # Local development volumes & live reload configurations
└── README.md                # This document
```

---

## 3. Requirements

To run the application, ensure the following are installed:
*   **Docker & Docker Compose** (minimum Docker Compose v2.0+)
*   **Node.js (v20+)** (optional, for running local non-containerized UI dev server)
*   **PHP 8.2+ & Composer** (optional, for running local non-containerized Laravel backend)
*   **MySQL 8.0** (provided via Docker Compose)

---

## 4. Getting Started

### 4.1 Simple Bootstrap (Recommended)

1.  Clone this repository.
2.  Copy `.env.example` into a local `.env` configuration file:
    ```bash
    cp .env.example .env
    ```
3.  Start the entire development environment:
    ```bash
    docker compose up --build
    ```
4.  Once started, access the services:
    *   **Frontend Client**: [http://localhost](http://localhost)
    *   **Database (MySQL)**: `localhost:3306` (User: `root`, Password: matches `.env`)
    *   **Redis Cache**: `localhost:6379`
    *   **AI Service**: [http://localhost:8000](http://localhost:8000)

---

## 5. Development Infrastructure & Workflow

### 5.1 Backend (Laravel)
Once the Laravel app is initialized inside `server/`, run backend commands via Composer and Artisan:
*   **Install dependencies**: `composer install`
*   **Run migrations**: `php artisan migrate`
*   **Serve locally**: `php artisan serve`

### 5.2 Frontend (React)
*   **React SPA Build**: Run **`./client-build.sh`** to compile the client inside a Debian container.
*   **React Dev Server**: Run **`./client-dev.sh`** to launch Vite inside a container with HMR (Hot Module Replacement) mapped to `http://localhost:5173`.

### 5.3 Helper scripts (`scripts/`)
We include Bash helper scripts under `scripts/` for Linux/macOS:
*   **Start Stack**: `./scripts/start.sh`
*   **Stop Stack**: `./scripts/stop.sh`
*   **Rebuild**: `./scripts/rebuild.sh`
*   **Tail Logs**: `./scripts/logs.sh`

---

## 6. Running Tests

To run Laravel backend tests (once the backend is initialized):
```bash
php artisan test
```

To run frontend tests and checks:
```bash
cd client && npm run lint && npx tsc --noEmit
```

---

## 7. Production Deployment Guidelines

When moving your application to a production environment, ensure the following practices are implemented:

Environment Configuration: Set the `APP_ENV` variable explicitly to `production` and `APP_DEBUG` to `false`.

Database Security: Update the default MySQL password (`DB_PASSWORD`) to a strong, cryptographically secure string. Never commit this password to version control systems (VCS).

Secrets Management: Keep sensitive credentials—such as your `GEMINI_API_KEY` and Laravel `APP_KEY`—protected by storing them in a dedicated production manager like HashiCorp Vault, Azure Key Vault, or Kubernetes Secrets.

Reverse Proxy Configuration: Configure Nginx to bind to port 443 using valid SSL/TLS certificates, and mandate an automatic redirect from HTTP to HTTPS.

Multi-Stage Serving Deployment: Use a multi-stage process where the client application is built within a Node.js container and its assets are then transferred to Nginx. Optimize the Nginx service to efficiently serve compressed static bundles (Gzip and Brotli).
