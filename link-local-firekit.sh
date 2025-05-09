#!/bin/bash

# This script links the local levante-firekit package to your project
# Run this before starting your development environment

FIREKIT_PATH="/home/david/levante/levante-firekit"
DASHBOARD_PATH="/home/david/levante/levante-dashboard"

echo "🔗 Linking local levante-firekit to your project..."

# Check if firekit directory exists
if [ ! -d "$FIREKIT_PATH" ]; then
  echo "❌ Error: $FIREKIT_PATH does not exist"
  echo "Make sure your local levante-firekit repository is at the correct path"
  exit 1
fi

# Go to firekit directory and link it
echo "📦 Making local firekit available globally..."
(cd "$FIREKIT_PATH" && npm link)

# Go to dashboard directory and link to the global firekit
echo "🔄 Linking dashboard to local firekit..."
(cd "$DASHBOARD_PATH" && npm link @levante-framework/firekit)

echo "✅ Local firekit linked successfully!"
echo ""
echo "Now you can start your development environment:"
echo "  1. Start Firebase emulators: firebase emulators:start"
echo "  2. Start development server: npm run dev"
echo ""
echo "Or use ./start-dev.sh to do both at once" 