# PCBuilder Frontend Client Dockerfile
# Multi-stage build for React TypeScript application

# Build Stage
FROM node:20-slim AS build
WORKDIR /app

# Copy shared packages and client package files
COPY packages/ ./packages/
COPY client/package*.json ./client/

# Install client dependencies
WORKDIR /app/client
RUN npm install

# Copy client source code and build static bundle
COPY client/ ./
RUN npm run build

# Production Server Stage
FROM nginx:alpine AS production
COPY --from=build /app/client/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed, default otherwise
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
