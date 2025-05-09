#!/bin/bash

# Main script to start development environment with local firekit and emulators

# 1. Link local firekit package
echo "📦 Step 1: Linking local levante-firekit package..."
./link-local-firekit.sh

# 2. Start Firebase emulators in the background
echo "🔥 Step 2: Starting Firebase emulators in background..."
./start-emulators.sh &
EMULATOR_PID=$!

# Wait for emulators to start
echo "⏳ Waiting for emulators to start..."
sleep 10

# 3. Start development server
echo "💻 Step 3: Starting development server..."
./start-dev-server.sh

# Cleanup on exit
echo "🧹 Cleaning up..."
kill $EMULATOR_PID
wait 