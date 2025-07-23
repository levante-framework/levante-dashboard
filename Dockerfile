FROM node:20

# Instala Java (requisito do Firebase Emulator) e outras dependências do Cypress
RUN apt-get update && apt-get install -y \
  default-jre \
  curl \
  libgtk-3-0 \
  libgbm-dev \
  libnotify-dev \
  libgconf-2-4 \
  libnss3 \
  libxss1 \
  libasound2 \
  libxtst6 \
  xvfb && \
  npm install -g firebase-tools vite wait-on

# Define diretório de trabalho
WORKDIR /e2e

# Copia todo o projeto para dentro do container
COPY . .

# Instala dependências do projeto e das funções Firebase
RUN npm install && \
    cd firebase-functions && npm install && \
    cd functions/levante-admin && npm install && npm run build

# Executa o seed nos emuladores (sem falhar se não existir)
RUN cd /e2e/firebase-functions && npm run emulator:seed || true

# Define variáveis de ambiente
ENV VITE_EMULATOR=TRUE
ENV VITE_FIREBASE_PROJECT=DEV
ENV VITE_LEVANTE=TRUE
ENV VITE_QUERY_DEVTOOLS_ENABLED=false
ENV CI=true
ENV NODE_ENV=development

# Comando principal: inicia emuladores, o Vite e roda os testes Cypress
CMD ["sh", "-c", "\
  cd firebase-functions && npm run dev & \
  sleep 10 && \
  cd /e2e && npm run dev & \
  echo 'Waiting for app...' && \
  npx wait-on http://localhost:5173 && \
  npx cypress run --browser chrome --record --parallel"]
