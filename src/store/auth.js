import { acceptHMRUpdate, defineStore } from 'pinia';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';
import _isEmpty from 'lodash/isEmpty';
import _union from 'lodash/union';
import { initNewFirekit } from '../firebaseInit';
import { AUTH_SSO_PROVIDERS } from '../constants/auth';
import { isDevMode, isTestUser, getMockFirebaseUser, TEST_USER_EMAIL, TEST_USER_ID } from '@/helpers/mockDataProvider';

export const useAuthStore = () => {
  return defineStore('authStore', {
    id: 'authStore',
    state: () => {
      return {
        spinner: false,
        firebaseUser: {
          adminFirebaseUser: null,
          appFirebaseUser: null,
        },
        adminOrgs: null,
        roarfirekit: null,
        userData: null,
        userClaims: null,
        routeToProfile: false,
        ssoProvider: null,
        showOptionalAssessments: false,
        adminAuthStateListener: null,
        appAuthStateListener: null,
      };
    },
    getters: {
      uid: (state) => {
        return state.firebaseUser.adminFirebaseUser?.uid;
      },
      roarUid: (state) => {
        return state.userClaims?.claims?.roarUid;
      },
      email: (state) => {
        return state.firebaseUser.adminFirebaseUser?.email;
      },
      isUserAuthedAdmin: (state) => {
        return Boolean(state.firebaseUser.adminFirebaseUser);
      },
      isUserAuthedApp: (state) => {
        return Boolean(state.firebaseUser.appFirebaseUser);
      },
      isAuthenticated: (state) => {
        return Boolean(state.firebaseUser.adminFirebaseUser) && Boolean(state.firebaseUser.appFirebaseUser);
      },
      isFirekitInit: (state) => {
        return state.roarfirekit?.initialized;
      },
      isUserAdmin: (state) => {
        if (state.userClaims?.claims?.super_admin || state.userClaims?.claims?.admin) return true;
        if (_isEmpty(_union(...Object.values(state.userClaims?.claims?.minimalAdminOrgs ?? {})))) return false;
        return true;
      },
      isUserSuperAdmin: (state) => Boolean(state.userClaims?.claims?.super_admin),
    },
    actions: {
      async initFirekit() {
        try {
          this.roarfirekit = await initNewFirekit();
          this.setAuthStateListeners();
        } catch (error) {
          // @TODO: Improve error handling as this is a critical error.
          console.error('Error initializing Firekit:', error);
        }
      },
      setAuthStateListeners() {
        this.adminAuthStateListener = onAuthStateChanged(this.roarfirekit?.admin.auth, async (user) => {
          if (user) {
            this.localFirekitInit = true;
            this.firebaseUser.adminFirebaseUser = user;
          } else {
            this.firebaseUser.adminFirebaseUser = null;
          }
        });
        this.appAuthStateListener = onAuthStateChanged(this.roarfirekit?.app.auth, async (user) => {
          if (user) {
            this.firebaseUser.appFirebaseUser = user;
          } else {
            this.firebaseUser.appFirebaseUser = null;
          }
        });
      },
      async completeAssessment(adminId, taskId) {
        await this.roarfirekit.completeAssessment(adminId, taskId);
      },
      async getLegalDoc(docName) {
        return await this.roarfirekit.getLegalDoc(docName);
      },
      async registerWithEmailAndPassword({ email, password, userData }) {
        return this.roarfirekit.createStudentWithEmailPassword(email, password, userData);
      },
      async logInWithEmailAndPassword({ email, password }) {
        if (this.isFirekitInit) {
          // Trim the email to remove any leading/trailing spaces and parentheses
          const trimmedEmail = email.trim().replace(/[\(\)]/g, '');
          console.log('Attempting login with:', { email: trimmedEmail });
          
          // Special handling for test user in development mode
          if (isDevMode() && trimmedEmail === TEST_USER_EMAIL) {
            console.log('Using test user bypass for emulator development');
            
            if (!TEST_USER_ID || TEST_USER_ID === '') {
              console.error('TEST_USER_ID is not set. Please run setup-test-user-preserve.js and update testUserConfig.js');
              console.log('Trying standard login flow as fallback...');
            } else {
              console.log(`Setting up mock emulator user with ID: ${TEST_USER_ID}`);
              // For the test user, always use the mock user
              const mockUser = getMockFirebaseUser();
              
              // Verify the mock user has a valid UID
              if (mockUser.uid === '') {
                console.warn('Mock user has empty UID. Setting it to TEST_USER_ID value.');
                mockUser.uid = TEST_USER_ID;
              }
              
              // Set the mock user in Firekit
              this.firebaseUser.adminFirebaseUser = mockUser;
              this.firebaseUser.appFirebaseUser = mockUser;
              
              console.log('Mock user set up successfully with UID:', mockUser.uid);
              console.log('Admin user:', this.firebaseUser.adminFirebaseUser);
              console.log('App user:', this.firebaseUser.appFirebaseUser);
              
              return {
                adminUser: mockUser,
                appUser: mockUser
              };
            }
          }
          
          // Standard login flow - use RoarFirekit for all authentication
          try {
            const result = await this.roarfirekit.logInWithEmailAndPassword({
              email: trimmedEmail,
              password
            });
            
            console.log('Login successful using RoarFirekit');
            console.log('Admin user:', this.firebaseUser.adminFirebaseUser);
            console.log('App user:', this.firebaseUser.appFirebaseUser);
            
            return result;
          } catch (error) {
            console.error('Error logging in:', error);
            
            // Special fallback for test user
            if (isDevMode() && trimmedEmail === TEST_USER_EMAIL && password === 'test123' && TEST_USER_ID) {
              console.warn('Login failed but this is the test user. Using mock data as fallback.');
              
              const mockUser = getMockFirebaseUser();
              // Ensure UID is set
              if (mockUser.uid === '') {
                mockUser.uid = TEST_USER_ID;
              }
              
              this.firebaseUser.adminFirebaseUser = mockUser;
              this.firebaseUser.appFirebaseUser = mockUser;
              
              console.log('Mock user created with UID:', mockUser.uid);
              
              return {
                adminUser: mockUser,
                appUser: mockUser
              };
            }
            
            throw error;
          }
        } else {
          console.error('Firekit not initialized');
          throw new Error('Firekit not initialized. Please refresh the page and try again.');
        }
      },
      async initiateLoginWithEmailLink({ email }) {
        if (this.isFirekitInit) {
          const redirectUrl = `${window.location.origin}/auth-email-link`;
          return this.roarfirekit.initiateLoginWithEmailLink({ email, redirectUrl }).then(() => {
            window.localStorage.setItem('emailForSignIn', email);
          });
        }
      },
      async signInWithEmailLink({ email, emailLink }) {
        if (this.isFirekitInit) {
          return this.roarfirekit.signInWithEmailLink({ email, emailLink }).then(() => {
            window.localStorage.removeItem('emailForSignIn');
          });
        }
      },
      async signInWithGooglePopup() {
        if (this.isFirekitInit) {
          return this.roarfirekit.signInWithPopup(AUTH_SSO_PROVIDERS.GOOGLE);
        }
      },
      async signInWithGoogleRedirect() {
        return this.roarfirekit.initiateRedirect(AUTH_SSO_PROVIDERS.GOOGLE);
      },
      async initStateFromRedirect() {
        this.spinner = true;
        const enableCookiesCallback = () => {
          const router = useRouter();
          router.replace({ name: 'EnableCookies' });
        };
        if (this.isFirekitInit) {
          return await this.roarfirekit.signInFromRedirectResult(enableCookiesCallback).then((result) => {
            // If the result is null, then no redirect operation was called.
            if (result !== null) {
              this.spinner = true;
            } else {
              this.spinner = false;
            }
          });
        }
      },
      async forceIdTokenRefresh() {
        await this.roarfirekit.forceIdTokenRefresh();
      },
      async sendMyPasswordResetEmail() {
        if (this.email) {
          return await this.roarfirekit.sendPasswordResetEmail(this.email).then(() => {
            return true;
          });
        } else {
          console.warn('Logged in user does not have an associated email. Unable to send password reset email');
          return false;
        }
      },
      async createUsers(userData) {
        return this.roarfirekit.createUsers(userData);
      },
    },
    persist: {
      storage: sessionStorage,
      paths: ['firebaseUser', 'ssoProvider'],
      debug: false,
    },
  })();
};

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
