# Multi-stage production Dockerfile for PC-KINBA
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy root workspace and package manifests
COPY package*.json ./
COPY packages/ ./packages/
COPY client/package*.json ./client/

# Install all dependencies (including build tools)
RUN npm ci
RUN cd client && npm ci

# Copy client source code and build packages + client bundle
COPY client/ ./client/
RUN npm run build:packages
RUN cd client && npm run build

# Production runner stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install Python & curl for scrapers / healthcanary / container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy root and workspace package files and install production dependencies
COPY package*.json ./
COPY packages/ ./packages/
RUN npm ci --omit=dev --ignore-scripts

# Copy pre-built compatibility rules dist from builder
COPY --from=builder /app/packages/compat-rules/dist ./packages/compat-rules/dist

# Copy backend server files, helper libraries, scrapers, and the built client SPA
COPY server.js mailer.js ./
COPY lib/ ./lib/
COPY scrapers/ ./scrapers/
COPY utils/ ./utils/
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ || exit 1

CMD ["node", "server.js"]
