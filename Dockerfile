FROM node:20

# Install Firebase CLI and Cypress deps
RUN npm install -g firebase-tools \
  && apt-get update && apt-get install -y \
  curl libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 \
  libnss3 libxss1 libasound2 libxss1 libxtst6 xvfb

WORKDIR /e2e

COPY . .

# Install deps
RUN npm install && \
    cd firebase-functions && npm install && \
    cd functions/levante-admin && npm install && npm run build

# Seed emulator data
RUN cd /e2e/firebase-functions && npm run emulator:seed || true

ENV VITE_EMULATOR=TRUE
ENV VITE_FIREBASE_PROJECT=DEV
ENV VITE_LEVANTE=TRUE
ENV VITE_QUERY_DEVTOOLS_ENABLED=false
ENV CI=true
ENV NODE_ENV=development

# Start emulators, dev server, then Cypress
CMD sh -c "\
  cd firebase-functions && npm run dev & \
  sleep 10 && \
  cd /e2e && npm run dev & \
  echo 'Waiting for app...' && \
  npx wait-on http://localhost:5173 && \
  npx cypress run --browser chrome --record --parallel"
