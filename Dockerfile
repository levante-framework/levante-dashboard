FROM node:20-alpine

# Install system dependencies
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
    # Native module dependencies
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    gcc \
    g++ \
    make \
    python3 \
    pixman-dev \
    libpng-dev \
    giflib-dev \
    librsvg-dev

# Install global tools
RUN npm install -g firebase-tools vite wait-on

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Copy firebase-functions (checked out by GitHub Actions)
COPY firebase-functions ./firebase-functions

# Install and build firebase-functions
RUN cd firebase-functions && npm install
RUN cd firebase-functions/functions/levante-admin && npm install && npm run build

# Set environment variables
ENV VITE_EMULATOR=TRUE
ENV VITE_FIREBASE_PROJECT=DEV
ENV VITE_LEVANTE=TRUE
ENV VITE_QUERY_DEVTOOLS_ENABLED=false
ENV CI=true
ENV NODE_ENV=development
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress

# Expose ports
EXPOSE 5173 4001 9199 8180 5002 9899

# Startup script
COPY <<EOF /app/start.sh
#!/bin/bash
set -e

echo "Starting Firebase emulators..."
cd firebase-functions
npx firebase use demo-levante-test --add || true
npm run dev &
FIREBASE_PID=\$!

echo "Waiting for Firebase emulators..."
for i in {1..60}; do
    if curl -s http://localhost:4001 > /dev/null 2>&1 && \
       curl -s http://localhost:9199 > /dev/null 2>&1 && \
       curl -s http://localhost:8180 > /dev/null 2>&1 && \
       curl -s http://localhost:5002 > /dev/null 2>&1 && \
       curl -s http://localhost:9899 > /dev/null 2>&1; then
        echo "Firebase emulators are ready!"
        break
    fi
    if [ \$i -eq 60 ]; then
        echo "Firebase emulators failed to start"
        exit 1
    fi
    echo "Waiting for emulators... (\$i/60)"
    sleep 1
done

echo "Seeding emulator data..."
npm run emulator:seed || true

echo "Starting Vite dev server..."
cd /app
npm run dev &
VITE_PID=\$!

echo "Waiting for Vite dev server..."
npx wait-on http://localhost:5173 --timeout=60000

echo "Running Cypress tests..."
npx cypress run --browser chromium --headless --record --parallel

# Cleanup
kill \$VITE_PID 2>/dev/null || true
kill \$FIREBASE_PID 2>/dev/null || true
wait \$VITE_PID 2>/dev/null || true
wait \$FIREBASE_PID 2>/dev/null || true
EOF

RUN chmod +x /app/start.sh

# Main command
CMD ["/app/start.sh"] 