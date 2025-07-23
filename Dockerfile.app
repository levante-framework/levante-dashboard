FROM node:20-alpine

# Install system dependencies for native modules
RUN apk add --no-cache \
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

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Set environment variables
ENV VITE_EMULATOR=TRUE
ENV VITE_FIREBASE_PROJECT=DEV
ENV VITE_LEVANTE=TRUE
ENV VITE_QUERY_DEVTOOLS_ENABLED=false
ENV CI=true
ENV NODE_ENV=development

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=30 \
    CMD curl -f http://localhost:5173 || exit 1

# Start Vite dev server
CMD ["npm", "run", "dev"] 