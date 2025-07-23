# Multi-stage build for optimization
FROM node:20-alpine AS base

# Install system dependencies required for Cypress, Firebase and native modules
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openjdk11-jre \
    curl \
    bash \
    # Dependencies for canvas and other native modules
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    gcc \
    g++ \
    make \
    python3

# Install global tools
RUN npm install -g firebase-tools vite wait-on

# Set Cypress environment variables
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress
ENV CYPRESS_REMOTE_DEBUGGING_PORT=9222
ENV NPM_CONFIG_CACHE=/root/.npm

# Set environment variables for native modules
ENV PKG_CONFIG_PATH=/usr/lib/pkgconfig
ENV PKG_CONFIG_LIBDIR=/usr/lib/pkgconfig
ENV NPM_CONFIG_UNSAFE_PERM=true
ENV NPM_CONFIG_CACHE=/root/.npm

# Stage for dependency installation
FROM base AS deps

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json package-lock.json ./

# Install dependencies step by step
RUN cd /app && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --verbose --no-audit --no-fund --prefer-offline

# Final stage
FROM base AS final

# Set working directory
WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables
ENV VITE_EMULATOR=TRUE
ENV VITE_FIREBASE_PROJECT=DEV
ENV VITE_LEVANTE=TRUE
ENV VITE_QUERY_DEVTOOLS_ENABLED=false
ENV CI=true
ENV NODE_ENV=development
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser

# Expose port
EXPOSE 5173

# Startup script
COPY <<EOF /app/start.sh
#!/bin/bash
set -e

echo "Starting development server..."
npm run dev &
DEV_PID=\$!

echo "Waiting for app to be ready..."
npx wait-on http://localhost:5173 --timeout=60000

echo "Running Cypress tests..."
npx cypress run --browser chromium --headless

# Cleanup
kill \$DEV_PID 2>/dev/null || true
wait \$DEV_PID 2>/dev/null || true
EOF

RUN chmod +x /app/start.sh

# Main command
CMD ["/app/start.sh"]
