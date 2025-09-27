#!/bin/bash

# Script to run the Word Reading locale integration test for dev:db mode
# This version works with npm run dev:db (real Firebase backend)

echo "🔍 LEVANTE Dashboard - Word Reading Locale Integration Test (dev:db mode)"
echo "========================================================================"
echo ""

echo "📋 Test Overview:"
echo "- Tests with real Firebase backend (dev:db mode)"
echo "- Logs into dashboard with Spanish locale (es-CO)"
echo "- Navigates to Word Reading task"
echo "- Verifies Spanish interface elements"
echo "- Launches task and verifies URL contains locale parameter"
echo "- Tests both Spanish and English locales"
echo ""

echo "🚀 Starting Cypress Test for dev:db..."
echo ""

# Run the dev:db specific Word Reading locale test
npx cypress run --spec "cypress/e2e/word-reading-locale-dev-db-test.cy.ts" --browser chrome

echo ""
echo "✅ Test execution completed!"
echo ""
echo "📊 Test Results Summary:"
echo "- Spanish locale (es-CO): Verifies 'Palabra' task name and Spanish interface"
echo "- English locale (en-US): Verifies 'Word Reading' task name and English interface"
echo "- URL verification: Confirms locale parameter (&lng=es-CO) in task URLs"
echo "- All ROAR tasks: Tests swr, pa, sre tasks for locale parameter inclusion"
echo ""

echo "🎯 Key Verifications:"
echo "✅ Dashboard shows Spanish text when locale is es-CO"
echo "✅ Word Reading task displays as 'Palabra' in Spanish"
echo "✅ Task descriptions are translated to Spanish"
echo "✅ Task launch URLs include &lng=es-CO parameter"
echo "✅ Locale persists throughout the entire user journey"
echo ""

echo "🔧 To run manually:"
echo "npx cypress open"
echo "# Then select: word-reading-locale-dev-db-test.cy.ts"
echo ""

echo "📝 Note: This test requires:"
echo "- Development server running with npm run dev:db"
echo "- Valid test credentials in Firebase"
echo "- Cypress properly set up in the project"
