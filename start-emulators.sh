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
firebase emulators:start --import=./emulator_data/emulator_data --export-on-exit=./emulator_data/emulator_data

# This script will block until the emulators are stopped
echo "✅ Emulators stopped" 