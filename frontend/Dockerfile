FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Render uses PORT env var
EXPOSE 80

# Use PORT environment variable
CMD sed -i "s/listen 80;/listen ${PORT:-80};/g" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
