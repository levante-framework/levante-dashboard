import { ref } from 'vue';
import { vi } from 'vitest';

/**
 * Common auth store mock for testing
 * 
 * This provides a reusable mock for the auth store that can be used across
 * different test files to maintain consistency and reduce duplication.
 * 
 * @param {Object} overrides - Optional overrides for specific test needs
 * @returns {Object} Mock auth store object
 */
export const createAuthStoreMock = (overrides = {}) => {
  const defaultMock = {
    // Authentication methods
    logInWithEmailAndPassword: vi.fn(),
    initiateLoginWithEmailLink: vi.fn(),
    signInWithGooglePopup: vi.fn(),
    signInWithGoogleRedirect: vi.fn(),
    signOut: vi.fn(),
    
    // User info methods
    getUserId: vi.fn(() => 'test-user-id'),
    isUserSuperAdmin: vi.fn(() => false),
    isUserAdmin: vi.fn(() => false),
    
    // Store properties
    spinner: false,
    $subscribe: vi.fn(),
    
    // Firekit configuration
    roarfirekit: ref({
      restConfig: true,
      roarConfig: {
        admin: {
          projectId: 'test-project-id',
        },
      },
    }),
  };

  return {
    ...defaultMock,
    ...overrides,
  };
};

/**
 * Common auth store mock with admin privileges
 * 
 * @param {Object} overrides - Optional overrides for specific test needs
 * @returns {Object} Mock auth store object with admin privileges
 */
export const createAdminAuthStoreMock = (overrides = {}) => {
  return createAuthStoreMock({
    isUserSuperAdmin: vi.fn(() => true),
    isUserAdmin: vi.fn(() => true),
    ...overrides,
  });
};

/**
 * Common auth store mock with regular user privileges
 * 
 * @param {Object} overrides - Optional overrides for specific test needs
 * @returns {Object} Mock auth store object with regular user privileges
 */
export const createUserAuthStoreMock = (overrides = {}) => {
  return createAuthStoreMock({
    isUserSuperAdmin: vi.fn(() => false),
    isUserAdmin: vi.fn(() => false),
    ...overrides,
  });
};
