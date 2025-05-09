#!/bin/bash

# Start development server with emulator configuration
echo "🚀 Starting Levante Dashboard development server..."

# Set environment variables for development
export VITE_LEVANTE=TRUE
export VITE_FIREBASE_PROJECT=DEV
export VITE_USE_EMULATORS=TRUE

# Import test user into auth emulator if it's running
echo "👤 Trying to create test user in auth emulator..."
curl -s -X POST "http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "returnSecureToken": true
  }' > /dev/null || echo "⚠️  Could not create test user - make sure emulators are running"

# Start the development server
echo "💻 Starting Vite development server..."
npx vite --force --host 