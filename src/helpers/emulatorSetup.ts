/**
 * Emulator setup utilities
 * This file provides helper functions for setting up the Firebase emulator environment
 */

import { Auth, UserCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { TEST_USER_EMAIL, setTestUserId } from './mockDataProvider';

// Test user credentials - use these to login during development
export const TEST_USER_PASSWORD = 'password123';

/**
 * Check if the current environment is development mode
 * @returns {boolean} True if in development mode
 */
export const isDevMode = (): boolean => {
  return import.meta.env.DEV === true;
};

/**
 * Initialize the test user ID from a Firebase Auth emulator
 * @param {Auth} auth - The Firebase Auth instance
 * @returns {Promise<string|null>} - The user ID if found, null otherwise
 */
export const initTestUserFromEmulator = async (auth: Auth): Promise<string | null> => {
  console.log('%c === EMULATOR TEST USER INITIALIZATION === ', 'background: #673AB7; color: #fff; font-size: 12px; padding: 3px; border-radius: 4px;');
  
  if (!isDevMode()) {
    console.log('Not in development mode, skipping emulator test user setup');
    return null;
  }
  
  // Check if we're actually using the emulator
  let isUsingEmulator = false;
  
  if (typeof window !== 'undefined' && window.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log('%c Auth emulator host detected:', 'font-weight: bold;', window.FIREBASE_AUTH_EMULATOR_HOST);
    isUsingEmulator = true;
  } else {
    console.warn('%c Auth emulator host not set in window object!', 'background: #FFC107; color: #000; font-weight: bold;');
  }
  
  if (!isUsingEmulator) {
    console.warn('%c Not using emulators, skipping test user initialization', 'color: #FF9800; font-weight: bold;');
    return null;
  }
  
  console.log('%c Auth object provided:', 'font-weight: bold;', {
    currentUser: auth.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified
    } : null,
    tenantId: auth.tenantId,
    config: auth.config
  });
  
  try {
    // Try to get the user from the emulator
    console.log('%c Checking for test user in emulator:', 'font-weight: bold;', TEST_USER_EMAIL);
    
    // First check if we're already signed in
    if (auth.currentUser && auth.currentUser.email === TEST_USER_EMAIL) {
      console.log('%c Already signed in as test user with UID:', 'background: #4CAF50; color: #fff;', auth.currentUser.uid);
      setTestUserId(auth.currentUser.uid);
      return auth.currentUser.uid;
    }
    
    // Try to sign in with the test user credentials
    try {
      console.log('%c Attempting to sign in with test credentials...', 'font-weight: bold;');
      
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        TEST_USER_EMAIL,
        TEST_USER_PASSWORD
      );
      
      if (userCredential && userCredential.user) {
        const uid = userCredential.user.uid;
        console.log('%c Successfully signed in as test user with UID:', 'background: #4CAF50; color: #fff;', uid);
        console.log('%c User details:', 'font-weight: bold;', {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified,
          displayName: userCredential.user.displayName,
          phoneNumber: userCredential.user.phoneNumber,
          providerId: userCredential.user.providerId
        });
        
        // Update our mock data provider with the real UID
        setTestUserId(uid);
        return uid;
      } else {
        console.warn('%c Sign-in successful but no user returned', 'background: #FF9800; color: #000;');
      }
    } catch (signInError: any) {
      console.warn('%c Sign-in error:', 'background: #F44336; color: #fff;', signInError.code);
      console.error('Error details:', signInError);
      
      // If the user doesn't exist, suggest creating it
      if (signInError.code === 'auth/user-not-found') {
        console.error('%c Test user not found in emulator.', 'background: #F44336; color: #fff; font-weight: bold;');
        console.error('Please try creating a user manually with:');
        console.error(`Email: ${TEST_USER_EMAIL}`);
        console.error(`Password: ${TEST_USER_PASSWORD}`);
        console.error('Or run the setup script: cd /home/david/levante/firebase-functions && node setup-test-user-preserve.js');
      } else if (signInError.code === 'auth/wrong-password') {
        console.error('%c Wrong password for test user.', 'background: #F44336; color: #fff; font-weight: bold;');
        console.error(`The correct password should be "${TEST_USER_PASSWORD}".`);
      } else if (signInError.code.includes('network')) {
        console.error('%c Network error connecting to emulator.', 'background: #F44336; color: #fff; font-weight: bold;');
        console.error('Make sure the emulators are running on:');
        console.error('- Auth: 127.0.0.1:9199 or 0.0.0.0:9199');
        console.error('- Firestore: 127.0.0.1:8180 or 0.0.0.0:8180');
        console.error('- Functions: 127.0.0.1:5102 or 0.0.0.0:5102');
        console.error('You can check if they are running with: lsof -i :9199,:8180,:5102');
        console.error('You can start them with: cd /home/david/levante/levante-dashboard && bash start-emulators.sh');
      } else if (signInError.code === 'auth/internal-error') {
        console.error('%c Internal error in Auth emulator.', 'background: #F44336; color: #fff; font-weight: bold;');
        console.error('This could be due to:');
        console.error('1. The emulator is not running correctly');
        console.error('2. Host/port configuration mismatch between app and emulator');
        console.error('3. CORS issues with the emulator');
        
        // Show the current emulator configuration
        if (typeof window !== 'undefined') {
          console.log('Current emulator configuration:');
          console.log('FIREBASE_AUTH_EMULATOR_HOST:', window.FIREBASE_AUTH_EMULATOR_HOST);
          console.log('FIRESTORE_EMULATOR_HOST:', window.FIRESTORE_EMULATOR_HOST);
          console.log('FUNCTIONS_EMULATOR_HOST:', window.FUNCTIONS_EMULATOR_HOST);
        }
      }
    }
    
    console.warn('%c Could not sign in as test user automatically', 'background: #FF9800; color: #000;');
    return null;
  } catch (error: any) {
    console.warn('%c Error initializing test user from emulator:', 'background: #F44336; color: #fff;', error);
    return null;
  }
};

/**
 * Set the test user ID manually (can be called from console)
 * @param {string} uid - The user ID to set
 * @returns {string} - The set user ID
 */
export const setEmulatorTestUserId = (uid: string): string | undefined => {
  if (!uid || typeof uid !== 'string' || uid.length < 5) {
    console.error('Invalid user ID provided');
    return;
  }
  
  console.log('Setting emulator test user ID manually to:', uid);
  return setTestUserId(uid);
};

// Add to window for easy console access
if (typeof window !== 'undefined' && isDevMode()) {
  (window as any).setEmulatorTestUserId = setEmulatorTestUserId;
}

// Export the functions
export default {
  initTestUserFromEmulator,
  setEmulatorTestUserId
}; 