#!/bin/bash

# Start Firebase emulators for Levante Dashboard
echo "🔥 Starting Firebase emulators for Levante Dashboard"

# Kill any existing emulators
echo "🧹 Cleaning up any existing emulator processes..."
pkill -f "firebase emulators" || true
sleep 2

# Ensure emulator data directory exists
mkdir -p ./emulator_data/emulator_data

# Start Firebase emulators
echo "🚀 Starting Firebase emulators..."
firebase emulators:start --import=./emulator_data/emulator_data --export-on-exit=./emulator_data/emulator_data &

# Wait for emulators to start
echo "⏳ Waiting for emulators to initialize..."
sleep 10

# Set up the test user
echo "👤 Setting up test user in emulators..."
node ./scripts/setup-emulator-test-user.js

# Keep the script running until user terminates
echo "✅ Emulators are running. Press Ctrl+C to stop."
wait
echo "✅ Emulators stopped" 