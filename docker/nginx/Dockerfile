# PCBuilder Nginx Proxy Dockerfile
FROM nginx:alpine

# Copy custom Nginx routing rules from context root
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
