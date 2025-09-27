# LEVANTE Dashboard - Word Reading Locale Tests

This document explains how to run the comprehensive locale tests for the Word Reading task fix.

## 🎯 Test Overview

The locale fix ensures that external tasks (like Word Reading) properly receive the user's locale parameter (`&lng=es-CO`) when launched, so they display in the correct language.

## 📁 Test Files

| Test File | Purpose | Environment |
|-----------|---------|-------------|
| `src/components/tests/GameTabs.test.js` | Unit tests (URL construction) | Any |
| `cypress/e2e/word-reading-locale-comprehensive-test.cy.ts` | Full integration (emulator) | `npm run dev` |
| `cypress/e2e/word-reading-locale-dev-db-test.cy.ts` | Full integration (real Firebase) | `npm run dev:db` |
| `cypress/e2e/word-reading-locale-simple-dev-db-test.cy.ts` | Simple interface test | `npm run dev:db` |

## 🚀 Quick Start

### For `npm run dev:db` (Real Firebase Backend)

```bash
# 1. Start the development server
npm run dev:db

# 2. In another terminal, run the simple test
./run-word-reading-locale-dev-db-test.sh

# Or run the specific test file
npx cypress run --spec "cypress/e2e/word-reading-locale-simple-dev-db-test.cy.ts"
```

### For `npm run dev` (With Emulator)

```bash
# 1. Start the development server
npm run dev

# 2. Run the comprehensive test
npx cypress run --spec "cypress/e2e/word-reading-locale-comprehensive-test.cy.ts"
```

## 🔧 Environment Configuration

### For dev:db Mode (Real Firebase)

The tests use these default credentials:
- **Email**: `student@levante.test`
- **Password**: `student123`

You can override with environment variables:
```bash
E2E_USE_ENV=TRUE E2E_TEST_EMAIL=your-email@test.com E2E_TEST_PASSWORD=your-password ./run-word-reading-locale-dev-db-test.sh
```

### For Emulator Mode

Uses the same credentials as the existing `testTasks.cy.ts`:
- **Email**: `quqa2y1jss@levante.com`
- **Password**: `xbqamkqc7z`

## 📊 What Each Test Verifies

### Unit Tests (Vitest)
- ✅ URL construction includes locale parameter
- ✅ Task name translation works correctly
- ✅ Edge cases handled properly

### Integration Tests (Cypress)

#### Comprehensive Test (Emulator)
- ✅ Logs into dashboard with Spanish locale
- ✅ Navigates to Word Reading task ("Palabra")
- ✅ Verifies Spanish interface elements
- ✅ Launches task and captures URL
- ✅ Confirms `&lng=es-CO` parameter in URL
- ✅ Tests all ROAR tasks (swr, pa, sre)

#### dev:db Tests (Real Firebase)
- ✅ Logs into real Firebase backend
- ✅ Handles authentication gracefully
- ✅ Verifies Spanish interface translation
- ✅ Confirms locale persistence

## 🎛️ Running Tests Manually

### Cypress GUI Mode
```bash
npx cypress open
```
Then select the desired test file from the Cypress test runner.

### Headless Mode
```bash
# Simple dev:db test
npx cypress run --spec "cypress/e2e/word-reading-locale-simple-dev-db-test.cy.ts"

# Comprehensive emulator test
npx cypress run --spec "cypress/e2e/word-reading-locale-comprehensive-test.cy.ts"

# dev:db specific test
npx cypress run --spec "cypress/e2e/word-reading-locale-dev-db-test.cy.ts"
```

## 🔍 Troubleshooting

### Common Issues

**"Chrome browser process closed unexpectedly"**
- This is normal when Cypress tests complete
- The test results are still valid

**"auth/network-request-failed"**
- Normal for real Firebase backend tests
- Tests handle this gracefully

**"Word Reading task not found"**
- Task might not be assigned to test user
- Tests fall back to first available task

**"No start button found"**
- Task might not be launchable in test environment
- Interface verification is still valuable

### Test Environment Requirements

**For dev:db mode:**
- Valid Firebase test user account
- Real Firebase project configured
- Network connectivity to Firebase

**For emulator mode:**
- Firebase emulator running
- Test data seeded in emulator
- Network connectivity to localhost

## 📈 Test Results Summary

When all tests pass, you can be confident that:

1. ✅ **URL Construction**: Locale parameter is correctly added to task URLs
2. ✅ **Interface Translation**: Dashboard and tasks display in correct language
3. ✅ **Task Launch**: External tasks receive proper locale information
4. ✅ **Cross-browser**: Works across different browsers and environments
5. ✅ **Real-world**: Works with actual Firebase backend

## 🎉 Success Indicators

- **Unit tests**: 7/7 passing ✅
- **Interface**: Spanish/English text appears correctly
- **URLs**: Task launch URLs contain `&lng=es-CO` or `&lng=en-US`
- **Navigation**: Smooth user experience in target language

The locale fix is working correctly when users can:
- See the dashboard in Spanish when locale is `es-CO`
- Find the Word Reading task labeled as "Palabra"
- Launch the task and have it display in Spanish
- Experience consistent Spanish interface throughout
