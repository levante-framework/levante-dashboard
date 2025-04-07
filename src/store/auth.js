import { acceptHMRUpdate, defineStore } from 'pinia';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';
import _isEmpty from 'lodash/isEmpty';
import _union from 'lodash/union';
import { initNewFirekit } from '../firebaseInit';
import { AUTH_SSO_PROVIDERS } from '../constants/auth';
// Assuming RoarFirekit type is available or defined elsewhere
// import type { RoarFirekit } from '../types'; // Example import

/**
 * @typedef {import('firebase/auth').User} FirebaseUser
 * @typedef {any} RoarFirekitInstance // Replace 'any' with actual RoarFirekit type if available
 * @typedef {any} UserData // Replace 'any' with actual UserData type if available
 * @typedef {any} UserClaims // Replace 'any' with actual UserClaims type if available
 * @typedef {import('firebase/auth').Unsubscribe} Unsubscribe
 */

export const useAuthStore = defineStore('authStore', {
  // id: 'authStore', // id is automatically inferred from the first argument
  state: () => {
    /**
     * @type {{
     *   spinner: boolean;
     *   firebaseUser: {
     *     adminFirebaseUser: FirebaseUser | null;
     *     appFirebaseUser: FirebaseUser | null;
     *   };
     *   adminOrgs: any | null; // Replace 'any' with actual type
     *   roarfirekit: RoarFirekitInstance | null;
     *   userData: UserData | null;
     *   userClaims: UserClaims | null;
     *   cleverOAuthRequested: boolean;
     *   classLinkOAuthRequested: boolean;
     *   routeToProfile: boolean;
     *   ssoProvider: string | null; // Consider using AUTH_SSO_PROVIDERS values type
     *   showOptionalAssessments: boolean;
     *   adminAuthStateListener: Unsubscribe | null;
     *   appAuthStateListener: Unsubscribe | null;
     * }}
     */
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
      cleverOAuthRequested: false,
      classLinkOAuthRequested: false,
      routeToProfile: false,
      ssoProvider: null,
      showOptionalAssessments: false,
      adminAuthStateListener: null,
      appAuthStateListener: null,
    };
  },
  getters: {
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    uid: (state) => {
      return state.firebaseUser.adminFirebaseUser?.uid;
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    roarUid: (state) => {
      // @ts-ignore TODO: Replace any with proper type for claims
      return state.userClaims?.claims?.roarUid;
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    email: (state) => {
      return state.firebaseUser.adminFirebaseUser?.email;
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    isUserAuthedAdmin: (state) => {
      return Boolean(state.firebaseUser.adminFirebaseUser);
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    isUserAuthedApp: (state) => {
      return Boolean(state.firebaseUser.appFirebaseUser);
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    isAuthenticated: (state) => {
      return Boolean(state.firebaseUser.adminFirebaseUser) && Boolean(state.firebaseUser.appFirebaseUser);
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    isFirekitInit: (state) => {
      // @ts-ignore TODO: Replace any with proper type for roarfirekit
      return state.roarfirekit?.initialized;
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    isUserAdmin: (state) => {
      // @ts-ignore TODO: Replace any with proper type for claims
      if (state.userClaims?.claims?.super_admin || state.userClaims?.claims?.admin) return true;
      // @ts-ignore TODO: Replace any with proper type for claims
      if (_isEmpty(_union(...Object.values(state.userClaims?.claims?.minimalAdminOrgs ?? {})))) return false;
      return true;
    },
    /** @param {ReturnType<typeof useAuthStore['state']>} state */
    isUserSuperAdmin: (state) => {
      // @ts-ignore TODO: Replace any with proper type for claims
      return Boolean(state.userClaims?.claims?.super_admin)
    },
  },
  actions: {
    /**
     * @param {string} adminId
     * @param {string} taskId
     */
    async completeAssessment(adminId, taskId) {
      //@TODO: Move to mutation since we cannot rotate query keys anymore.
      await this.roarfirekit?.completeAssessment(adminId, taskId);
    },
    async initFirekit() {
      this.spinner = true; // Set spinner true at the start
      try {
        this.roarfirekit = await initNewFirekit();
        if (!this.roarfirekit?.restConfig?.admin?.baseURL || !this.roarfirekit?.restConfig?.app?.baseURL) {
           console.error('Firekit initialization failed: restConfig base URLs not properly set.');
           throw new Error('Firekit initialization failed due to missing base URLs.');
        }
        console.log('Firekit initialized successfully with restConfig:', this.roarfirekit.restConfig);
        this.setAuthStateListeners();
      } catch (error) {
        // @TODO: Improve error handling as this is a critical error.
        console.error('Error initializing Firekit:', error);
        this.roarfirekit = null; // Ensure roarfirekit is null on failure
      } finally {
          this.spinner = false; // ALWAYS set spinner false after attempting init
          console.log('[AuthStore] initFirekit finished, spinner set to:', this.spinner);
      }
    },
    setAuthStateListeners() {
      if (!this.roarfirekit) return; // Guard against null roarfirekit

      this.adminAuthStateListener = onAuthStateChanged(this.roarfirekit.admin.auth, async (user) => {
        if (user) {
          // this.localFirekitInit = true; // localFirekitInit doesn't exist in state
          this.firebaseUser.adminFirebaseUser = user;
          // Fetch claims/user data here if needed upon auth change
        } else {
          this.firebaseUser.adminFirebaseUser = null;
          this.userClaims = null; // Clear claims on logout
          this.userData = null; // Clear user data on logout
        }
      });
      this.appAuthStateListener = onAuthStateChanged(this.roarfirekit.app.auth, async (user) => {
        if (user) {
          this.firebaseUser.appFirebaseUser = user;
        } else {
          this.firebaseUser.appFirebaseUser = null;
        }
      });
    },
    /** @param {string} docName */
    async getLegalDoc(docName) {
      return await this.roarfirekit?.getLegalDoc(docName);
    },
    /** @param {{ email: string, password: string, userData: any }} params */
    async registerWithEmailAndPassword({ email, password, userData }) {
      return this.roarfirekit?.createStudentWithEmailPassword(email, password, userData);
    },
     /** @param {{ email: string, password: string }} params */
    async logInWithEmailAndPassword({ email, password }) {
      if (this.isFirekitInit) { // Use getter
        console.log(`[AuthStore] logInWithEmailAndPassword - Attempting login for ${email}`);
        try {
          const loginResult = await this.roarfirekit?.logInWithEmailAndPassword({ email, password });
          console.log('[AuthStore] logInWithEmailAndPassword - roarfirekit call successful. Result:', loginResult);
          // Explicitly return nothing to potentially prevent unserializable data propagation
          return undefined; 
        } catch (error) {
            console.error('[AuthStore] logInWithEmailAndPassword - Error during roarfirekit call:', error);
            throw error;
        }
      }
    },
    /** @param {{ email: string }} params */
    async initiateLoginWithEmailLink({ email }) {
      if (this.isFirekitInit) { // Use getter
        const redirectUrl = `${window.location.origin}/auth-email-link`;
        return this.roarfirekit?.initiateLoginWithEmailLink({ email, redirectUrl }).then(() => {
          window.localStorage.setItem('emailForSignIn', email);
        });
      }
    },
    /** @param {{ email: string, emailLink: string }} params */
    async signInWithEmailLink({ email, emailLink }) {
      if (this.isFirekitInit) { // Use getter
        return this.roarfirekit?.signInWithEmailLink({ email, emailLink }).then(() => {
          window.localStorage.removeItem('emailForSignIn');
        });
      }
    },
    async signInWithGooglePopup() {
      if (this.isFirekitInit) { // Use getter
        return this.roarfirekit?.signInWithPopup(AUTH_SSO_PROVIDERS.GOOGLE);
      }
    },
    async signInWithGoogleRedirect() {
      // No init check needed for initiateRedirect
      return this.roarfirekit?.initiateRedirect(AUTH_SSO_PROVIDERS.GOOGLE);
    },
    async signInWithCleverPopup() {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLEVER;
      if (this.isFirekitInit) { // Use getter
        return this.roarfirekit?.signInWithPopup(AUTH_SSO_PROVIDERS.CLEVER);
      }
    },
    async signInWithCleverRedirect() {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLEVER;
       // No init check needed for initiateRedirect
      return this.roarfirekit?.initiateRedirect(AUTH_SSO_PROVIDERS.CLEVER);
    },
    async signInWithClassLinkPopup() {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLASSLINK;
      if (this.isFirekitInit) { // Use getter
        return this.roarfirekit?.signInWithPopup(AUTH_SSO_PROVIDERS.CLASSLINK);
      }
    },
    async signInWithClassLinkRedirect() {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLASSLINK;
       // No init check needed for initiateRedirect
      return this.roarfirekit?.initiateRedirect(AUTH_SSO_PROVIDERS.CLASSLINK);
    },
    async initStateFromRedirect() {
      this.spinner = true;
      const enableCookiesCallback = () => {
        const router = useRouter();
        router.replace({ name: 'EnableCookies' });
      };
      // Check roarfirekit directly as isFirekitInit getter might not be ready?
      if (this.roarfirekit) {
        try {
          const result = await this.roarfirekit.signInFromRedirectResult(enableCookiesCallback);
          // If the result is null, then no redirect operation was called.
          this.spinner = result !== null;
        } catch(error) {
            console.error("Error processing redirect result:", error);
            this.spinner = false;
        }
      } else {
         console.warn("initStateFromRedirect called before roarfirekit was initialized.");
         this.spinner = false;
      }
    },
    async forceIdTokenRefresh() {
      await this.roarfirekit?.forceIdTokenRefresh();
    },
    async sendMyPasswordResetEmail() {
      if (this.email) { // Use getter
        return await this.roarfirekit?.sendPasswordResetEmail(this.email).then(() => { // Use getter for email
          return true;
        });
      } else {
        console.warn('Logged in user does not have an associated email. Unable to send password reset email');
        return false;
      }
    },
    /**
     * @param {string} careTakerEmail
     * @param {string} careTakerPassword
     * @param {any} careTakerData // Replace 'any' with actual type
     * @param {any[]} students // Replace 'any' with actual type
     * @param {boolean} [isTestData=false]
     */
    async createNewFamily(careTakerEmail, careTakerPassword, careTakerData, students, isTestData = false) {
      return this.roarfirekit?.createNewFamily(careTakerEmail, careTakerPassword, careTakerData, students, isTestData);
    },

    // ------------------ LEVANTE ------------------
    /** @param {any} userData // Replace 'any' with actual type */
    async createLevanteUsers(userData) {
      return this.roarfirekit?.createLevanteUsersWithEmailPassword(userData);
    },
    /** @param {any} userData // Replace 'any' with actual type */
    async createUsers(userData) {
      return this.roarfirekit?.createUsers(userData);
    },
  },
  persist: {
    storage: sessionStorage,
    // Only persist specific, serializable parts of the state
    paths: [
      'firebaseUser.adminFirebaseUser.uid', // Persist only UID
      'firebaseUser.adminFirebaseUser.email', // Persist only email
      'firebaseUser.appFirebaseUser.uid',
      'firebaseUser.appFirebaseUser.email',
      'userData', // Assuming userData is serializable
      'userClaims', // Assuming userClaims are serializable
      'adminOrgs', // Assuming adminOrgs is serializable
      'cleverOAuthRequested',
      'classLinkOAuthRequested',
      'ssoProvider',
      'showOptionalAssessments',
      // DO NOT persist roarfirekit, adminAuthStateListener, appAuthStateListener
    ],
    debug: false,
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
