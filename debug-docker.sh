#!/bin/bash

# Debug script for Docker build issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    exit 1
fi

# Check if package-lock.json exists
if [ ! -f "package-lock.json" ]; then
    print_warning "package-lock.json not found! This might cause issues."
fi

# Check Node.js version
print_message "Checking Node.js version..."
node --version

# Check npm version
print_message "Checking npm version..."
npm --version

# Check Docker
print_message "Checking Docker..."
docker --version

# Check available disk space
print_message "Checking disk space..."
df -h .

# Check memory
print_message "Checking memory..."
free -h

# Try to identify problematic packages
print_message "Checking for native dependencies..."
grep -E "(canvas|sharp|node-gyp|native)" package.json || echo "No obvious native dependencies found"

# Show package.json scripts
print_message "Available npm scripts:"
npm run --silent 2>/dev/null || echo "No scripts available"

# Check if we can install dependencies locally
print_message "Testing local npm install..."
if npm install --dry-run >/dev/null 2>&1; then
    print_message "Local npm install test passed"
else
    print_error "Local npm install test failed"
fi

print_message "Debug information collected. Try building with:"
echo "  ./docker-build.sh full-simple" 