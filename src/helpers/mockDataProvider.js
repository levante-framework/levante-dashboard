/**
 * Mock data provider for development mode
 * This file provides mock data for various Firebase services when running in development mode
 */

// Test user ID that will be updated at runtime
// It will be filled with the actual UID from the emulator after user creation
export let TEST_USER_ID = '';
export const TEST_USER_EMAIL = 'test@example.com';

/**
 * Set the test user ID at runtime
 * This function updates the TEST_USER_ID at runtime
 * @param {string} uid - The user ID to set
 */
export const setTestUserId = (uid) => {
  console.log('Setting test user ID to:', uid);
  TEST_USER_ID = uid;
  
  // Output for easy console access
  console.log('============================================');
  console.log('TEST USER CONFIGURED: Copy this to use in console if needed');
  console.log(`TEST_USER_ID = '${uid}';`);
  console.log(`window.setEmulatorTestUserId('${uid}');`);
  console.log('============================================');
  
  return uid;
};

/**
 * Get mock user claims for the test user
 * @returns {Object} User claims object
 */
export const getMockUserClaims = () => {
  console.log('Providing mock user claims for test user');
  return {
    claims: {
      super_admin: true,
      admin: true,
      created: new Date().toISOString(),
      email: TEST_USER_EMAIL,
      roarUid: TEST_USER_ID,
      adminUid: TEST_USER_ID,
      assessmentUid: TEST_USER_ID,
      minimalAdminOrgs: {
        "test-district-1": ["admin"],
        "test-school-1": ["admin"]
      }
    }
  };
};

/**
 * Get a mock Firebase user object for the test user
 * @returns {Object} Firebase user object
 */
export const getMockFirebaseUser = () => {
  // Generate a fallback UID if TEST_USER_ID is empty
  const uid = TEST_USER_ID || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Log a warning if we're using a generated UID instead of the configured one
  if (!TEST_USER_ID) {
    console.warn('TEST_USER_ID is empty! Using generated UID:', uid);
    console.warn('For proper emulator integration, run setup-emulator-test-user.js');
    
    // Set the TEST_USER_ID so it's available for other functions
    setTestUserId(uid);
  }
  
  return {
    uid,
    email: TEST_USER_EMAIL,
    emailVerified: true,
    displayName: "Test User",
    isAnonymous: false,
    providerData: [{
      providerId: 'password',
      uid: TEST_USER_EMAIL,
      displayName: "Test User",
      email: TEST_USER_EMAIL,
      phoneNumber: null,
      photoURL: null
    }],
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    }
  };
};

/**
 * Check if the current environment is development mode
 * @returns {boolean} True if in development mode
 */
export const isDevMode = () => {
  return import.meta.env.DEV === true;
};

/**
 * Check if the provided user ID matches the test user ID
 * @param {string} uid - User ID to check
 * @returns {boolean} True if the user ID matches the test user
 */
export const isTestUser = (uid) => {
  return uid === TEST_USER_ID;
};

// Export a default object with all helper functions
export default {
  TEST_USER_ID,
  TEST_USER_EMAIL,
  setTestUserId,
  getMockUserClaims,
  getMockFirebaseUser,
  isDevMode,
  isTestUser
}; 