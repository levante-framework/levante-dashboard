# Multi-stage build para otimização
FROM node:20-alpine AS base

# Instala dependências do sistema necessárias para Cypress e Firebase
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
    bash

# Instala ferramentas globais necessárias
RUN npm install -g firebase-tools vite wait-on

# Define variáveis de ambiente para Cypress
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress
ENV CYPRESS_REMOTE_DEBUGGING_PORT=9222

# Stage para instalação de dependências
FROM base AS deps

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências com cache otimizado
RUN npm ci --only=production && npm cache clean --force

# Stage para dependências de desenvolvimento
FROM deps AS dev-deps

# Instala todas as dependências incluindo devDependencies
RUN npm ci

# Stage final
FROM base AS final

# Define diretório de trabalho
WORKDIR /app

# Copia dependências instaladas
COPY --from=dev-deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copia código fonte
COPY . .

# Define variáveis de ambiente
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

# Script de inicialização
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

# Comando principal
CMD ["/app/start.sh"]
