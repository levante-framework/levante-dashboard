/**
 * Emulator setup utilities
 * This file provides helper functions for setting up the Firebase emulator environment
 */

import { Auth, UserCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { TEST_USER_EMAIL, setTestUserId } from './mockDataProvider';

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
  if (!isDevMode()) {
    console.log('Not in development mode, skipping emulator test user setup');
    return null;
  }
  
  try {
    // Try to get the user from the emulator
    console.log('Checking for test user in emulator:', TEST_USER_EMAIL);
    
    // First check if we're already signed in
    if (auth.currentUser && auth.currentUser.email === TEST_USER_EMAIL) {
      console.log('Already signed in as test user with UID:', auth.currentUser.uid);
      setTestUserId(auth.currentUser.uid);
      return auth.currentUser.uid;
    }
    
    // Try to sign in with the test user credentials
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        TEST_USER_EMAIL,
        'test123'
      );
      
      if (userCredential && userCredential.user) {
        const uid = userCredential.user.uid;
        console.log('Successfully signed in as test user with UID:', uid);
        
        // Update our mock data provider with the real UID
        setTestUserId(uid);
        return uid;
      }
    } catch (signInError: any) {
      console.warn('Sign-in error:', signInError.code);
      
      // If the user doesn't exist, suggest creating it
      if (signInError.code === 'auth/user-not-found') {
        console.error('Test user not found in emulator. Please run the setup-test-user-preserve.js script.');
        console.error('Command: cd /home/david/levante/firebase-functions && node setup-test-user-preserve.js');
      } else if (signInError.code === 'auth/wrong-password') {
        console.error('Wrong password for test user. The correct password should be "test123".');
      } else if (signInError.code.includes('network')) {
        console.error('Network error connecting to emulator. Make sure the emulators are running on:');
        console.error('- Auth: 127.0.0.1:9199');
        console.error('- Firestore: 127.0.0.1:8180');
        console.error('You can start them with: cd /home/david/levante/firebase-functions && bash restart-emulators.sh');
      }
    }
    
    console.warn('Could not sign in as test user automatically');
    return null;
  } catch (error: any) {
    console.warn('Error initializing test user from emulator:', error);
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