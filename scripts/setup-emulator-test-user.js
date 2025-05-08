#!/usr/bin/env node

/**
 * Setup emulator test user
 * 
 * This script creates a test user in the Firebase Auth emulator
 * and saves the test user credentials for use in the application.
 */

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  connectAuthEmulator 
} = require('firebase/auth');
const { 
  getFirestore, 
  setDoc, 
  doc, 
  connectFirestoreEmulator 
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Default test user credentials
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';

// Emulator configuration
const EMULATOR_HOST = process.env.EMULATOR_HOST || '127.0.0.1';
const AUTH_PORT = parseInt(process.env.AUTH_PORT || '9199', 10);
const FIRESTORE_PORT = parseInt(process.env.FIRESTORE_PORT || '8180', 10);

// Get Firebase config from environment or use default values
const firebaseConfig = {
  apiKey: "demo-api-key",  // Not used with emulators
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

async function setupTestUser() {
  console.log('=== FIREBASE EMULATOR TEST USER SETUP ===');
  console.log(`Host: ${EMULATOR_HOST}`);
  console.log(`Auth Port: ${AUTH_PORT}`);
  console.log(`Firestore Port: ${FIRESTORE_PORT}`);
  
  try {
    // Initialize Firebase
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    
    // Set up Auth emulator
    console.log(`Connecting to Auth emulator at ${EMULATOR_HOST}:${AUTH_PORT}...`);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
    
    // Set up Firestore emulator
    console.log(`Connecting to Firestore emulator at ${EMULATOR_HOST}:${FIRESTORE_PORT}...`);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_PORT);
    
    // Create or login test user
    let userCredential;
    try {
      console.log(`Creating test user: ${TEST_USER_EMAIL}...`);
      userCredential = await createUserWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Test user created successfully!');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('Test user already exists.');
        // In a full implementation, you might want to login instead
      } else {
        throw error;
      }
    }
    
    if (userCredential && userCredential.user) {
      // Save user ID to file
      const uid = userCredential.user.uid;
      console.log(`Test user UID: ${uid}`);
      
      // Create a user profile document in Firestore
      console.log('Creating user profile in Firestore...');
      await setDoc(doc(db, 'users', uid), {
        email: TEST_USER_EMAIL,
        isAdmin: true,
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        displayName: 'Test User',
        roles: ['admin', 'user']
      });
      
      // Create required permissions
      console.log('Creating user permissions in Firestore...');
      await setDoc(doc(db, 'user_permissions', uid), {
        super_admin: true,
        admin: true,
        email: TEST_USER_EMAIL,
        created: new Date().toISOString(),
        roarUid: uid,
        adminUid: uid,
        assessmentUid: uid,
        minimalAdminOrgs: {
          "test-district-1": ["admin"],
          "test-school-1": ["admin"]
        }
      });
      
      // Create sample test data
      console.log('Creating sample data in Firestore...');
      await setDoc(doc(db, 'test_collection', 'sample_doc'), {
        name: 'Sample Document',
        created: new Date().toISOString(),
        createdBy: uid
      });
      
      // Save test user config to a file
      const testUserConfig = {
        TEST_USER_ID: uid,
        TEST_USER_EMAIL: TEST_USER_EMAIL,
      };
      
      // Write to a JS file that can be imported
      const configFilePath = path.join(__dirname, '..', 'src', 'helpers', 'testUserConfig.js');
      const configContent = `// Auto-generated test user configuration
module.exports = ${JSON.stringify(testUserConfig, null, 2)};
`;
      
      fs.writeFileSync(configFilePath, configContent);
      console.log(`Test user config saved to: ${configFilePath}`);
      
      // Also write to a .test-user-uid file for compatibility
      const uidFilePath = path.join(__dirname, '..', '.test-user-uid');
      fs.writeFileSync(uidFilePath, uid);
      console.log(`Test user UID saved to: ${uidFilePath}`);
      
      console.log('=== TEST USER SETUP COMPLETE ===');
      console.log(`Email: ${TEST_USER_EMAIL}`);
      console.log(`Password: ${TEST_USER_PASSWORD}`);
      console.log(`UID: ${uid}`);
    } else {
      console.log('Test user exists but UID could not be determined.');
    }
    
  } catch (error) {
    console.error('Error setting up test user:', error);
    process.exit(1);
  }
}

// Run the setup function
setupTestUser(); 