/**
 * Emulator setup utilities
 * This file provides helper functions for setting up the Firebase emulator environment
 */

import { signInWithEmailAndPassword } from 'firebase/auth';
import { TEST_USER_EMAIL, setTestUserId } from './mockDataProvider';

/**
 * Check if the current environment is development mode
 * @returns {boolean} True if in development mode
 */
export const isDevMode = () => {
  return import.meta.env.DEV === true;
};

/**
 * Initialize the test user ID from a Firebase Auth emulator
 * @param {Object} auth - The Firebase Auth instance
 * @returns {Promise<string|null>} - The user ID if found, null otherwise
 */
export const initTestUserFromEmulator = async (auth) => {
  if (!isDevMode()) {
    console.log('Not in development mode, skipping emulator test user setup');
    return null;
  }
  
  try {
    // Try to get the user from the emulator
    console.log('Checking for test user in emulator:', TEST_USER_EMAIL);
    
    // Use signInWithEmailAndPassword imported from firebase/auth
    const userCredential = await signInWithEmailAndPassword(
      auth,
      TEST_USER_EMAIL,
      'test123'
    );
    
    if (userCredential && userCredential.user) {
      const uid = userCredential.user.uid;
      console.log('Found test user in emulator with UID:', uid);
      
      // Update our mock data provider with the real UID
      setTestUserId(uid);
      return uid;
    }
    
    console.warn('Test user not found or login failed');
    return null;
  } catch (error) {
    console.warn('Error initializing test user from emulator:', error);
    
    // Special handling for user-not-found, which means we need to create it
    if (error.code === 'auth/user-not-found') {
      console.log('Test user not found in emulator. Please run setup-test-user.js script first.');
    }
    
    return null;
  }
};

/**
 * Set the test user ID manually (can be called from console)
 * @param {string} uid - The user ID to set
 * @returns {string} - The set user ID
 */
export const setEmulatorTestUserId = (uid) => {
  if (!uid || typeof uid !== 'string' || uid.length < 5) {
    console.error('Invalid user ID provided');
    return;
  }
  
  return setTestUserId(uid);
};

// Add to window for easy console access
if (typeof window !== 'undefined' && isDevMode()) {
  window.setEmulatorTestUserId = setEmulatorTestUserId;
}

// Export the functions
export default {
  initTestUserFromEmulator,
  setEmulatorTestUserId
}; 