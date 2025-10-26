# Multi-stage build for LLaMa-Herd Frontend
FROM node:18-alpine AS dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]

# Production build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables with defaults
ARG REACT_APP_API_BASE_URL=""
ARG REACT_APP_OLLAMA_BASE_URL="http://ollama:11434"

# Set environment variables for the build
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_OLLAMA_BASE_URL=$REACT_APP_OLLAMA_BASE_URL

# Verify environment variables are set
RUN echo "REACT_APP_API_BASE_URL='$REACT_APP_API_BASE_URL'" && \
    echo "REACT_APP_OLLAMA_BASE_URL='$REACT_APP_OLLAMA_BASE_URL'"

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS prod

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /run && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /run

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

