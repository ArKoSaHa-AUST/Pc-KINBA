# PCBuilder Frontend Client Dockerfile
# Multi-stage build for React TypeScript application

# Build Stage
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies
COPY client/package*.json ./
RUN npm install

# Copy source and build static bundle
COPY client/ ./
RUN npm run build

# Production Server Stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed, default otherwise
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
