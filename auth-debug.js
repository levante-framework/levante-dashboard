#!/usr/bin/env node

/**
 * Firebase Auth Emulator Debug Script
 * 
 * This script tests various auth configurations to debug issues with the Firebase Auth emulator.
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  connectAuthEmulator,
  signInAnonymously
} from 'firebase/auth';

// Test user credentials
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';

// Emulator configuration
const EMULATOR_HOST = '127.0.0.1';
const AUTH_PORT = 9199;

async function testAuth() {
  console.log('=== FIREBASE AUTH EMULATOR DEBUG ===');
  console.log(`Host: ${EMULATOR_HOST}`);
  console.log(`Auth Port: ${AUTH_PORT}`);
  
  // Different configurations to try
  const configs = [
    {
      name: 'Minimal config',
      apiKey: 'demo-key',
      projectId: 'demo-project'
    },
    {
      name: 'Full config',
      apiKey: 'demo-api-key',
      authDomain: 'demo-project.firebaseapp.com',
      projectId: 'demo-project',
      storageBucket: 'demo-project.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:0000000000000000000000'
    }
  ];
  
  // Try different environment variable configurations
  const envVarTests = [
    {
      name: 'With FIREBASE_AUTH_EMULATOR_HOST',
      setup: () => {
        process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${AUTH_PORT}`;
        console.log(`Set FIREBASE_AUTH_EMULATOR_HOST=${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
      },
      cleanup: () => {
        delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      }
    },
    {
      name: 'Without environment variables',
      setup: () => {
        delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
        console.log('Cleared FIREBASE_AUTH_EMULATOR_HOST');
      },
      cleanup: () => {}
    }
  ];
  
  // Try different auth operations
  const authOperations = [
    {
      name: 'Anonymous sign-in',
      execute: async (auth) => {
        console.log('Attempting anonymous sign-in...');
        const result = await signInAnonymously(auth);
        console.log('Anonymous sign-in successful:', result.user.uid);
        return true;
      }
    },
    {
      name: 'Test user sign-in',
      execute: async (auth) => {
        console.log(`Attempting to sign in with ${TEST_USER_EMAIL}...`);
        const result = await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
        console.log('Test user sign-in successful:', result.user.uid);
        return true;
      }
    }
  ];
  
  // Run all combinations of tests
  let successes = 0;
  let failures = 0;
  
  for (const envTest of envVarTests) {
    console.log(`\n=== Testing with ${envTest.name} ===`);
    envTest.setup();
    
    for (const config of configs) {
      console.log(`\n--- Testing with ${config.name} ---`);
      
      try {
        // Create a unique app name to avoid conflicts
        const appName = `debug-app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        console.log(`Initializing Firebase app "${appName}"...`);
        
        const app = initializeApp(config, appName);
        const auth = getAuth(app);
        
        try {
          console.log(`Connecting to Auth emulator at http://${EMULATOR_HOST}:${AUTH_PORT}...`);
          connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
          console.log('Successfully connected to Auth emulator');
          
          for (const operation of authOperations) {
            console.log(`\nExecuting: ${operation.name}`);
            try {
              await operation.execute(auth);
              console.log(`✅ ${operation.name} SUCCEEDED`);
              successes++;
            } catch (error) {
              console.error(`❌ ${operation.name} FAILED:`, error.message);
              console.error('Error code:', error.code);
              console.error('Error details:', error);
              failures++;
            }
          }
        } catch (error) {
          console.error('❌ Failed to connect to Auth emulator:', error.message);
          console.error('Error code:', error.code);
          failures++;
        }
      } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error.message);
        failures++;
      }
    }
    
    envTest.cleanup();
  }
  
  console.log('\n=== DEBUG SUMMARY ===');
  console.log(`Total successful operations: ${successes}`);
  console.log(`Total failed operations: ${failures}`);
  
  if (failures > 0) {
    console.log('\n=== TROUBLESHOOTING TIPS ===');
    console.log('1. Ensure emulators are running: firebase emulators:start');
    console.log('2. Check the port matches: Auth should be on port 9199');
    console.log('3. Try setting FIREBASE_AUTH_EMULATOR_HOST manually in your terminal');
    console.log('4. Try with different browser/incognito mode to avoid cached credentials');
    console.log('5. Check your firebase.json configuration to ensure ports match');
  }
}

// Run the debug function
testAuth(); 