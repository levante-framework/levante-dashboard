import { acceptHMRUpdate, defineStore, StoreDefinition } from 'pinia';
import { onAuthStateChanged, User, Unsubscribe } from 'firebase/auth';
import { useRouter } from 'vue-router';
import _isEmpty from 'lodash/isEmpty';
import _union from 'lodash/union';
import { initNewFirekit } from '../firebaseInit';
import { AUTH_SSO_PROVIDERS } from '../constants/auth';
// Assuming RoarFirekit type is available - adjust import path if needed
// If RoarFirekit type causes issues, replace its usage with 'any' as a fallback
import { RoarFirekit } from '@levante-framework/firekit'; // Adjusted path assumption

// --- Interfaces ---
interface FirebaseUserState {
  adminFirebaseUser: User | null;
  appFirebaseUser: User | null;
}

// Define more specific types if available, otherwise use 'any' as placeholder
type UserData = any;
type UserClaims = { claims?: Record<string, any> } | null; // Basic structure assumption
type AdminOrgs = any;

interface AuthState {
  spinner: boolean;
  firebaseUser: FirebaseUserState;
  adminOrgs: AdminOrgs | null;
  roarfirekit: RoarFirekit | null;
  userData: UserData | null;
  userClaims: UserClaims | null;
  cleverOAuthRequested: boolean;
  classLinkOAuthRequested: boolean;
  routeToProfile: boolean;
  ssoProvider: string | null;
  showOptionalAssessments: boolean;
  adminAuthStateListener: Unsubscribe | null;
  appAuthStateListener: Unsubscribe | null;
  isReady: boolean;
}

// Define interfaces for action parameters where helpful
interface RegisterParams {
  email: string;
  password: string;
  userData: UserData;
}

interface LoginParams {
  email: string;
  password: string;
}

interface EmailLinkParams {
  email: string;
  emailLink?: string;
}

interface CreateFamilyParams {
  careTakerEmail: string;
  careTakerPassword: string;
  careTakerData: any;
  students: any[];
  isTestData?: boolean;
}

// --- Store Definition ---
// Explicitly type the store definition
type AuthStoreDefinition = StoreDefinition<
    'authStore', // Id
    AuthState, // State
    { // Getters
        uid: (state: AuthState) => string | undefined;
        roarUid: (state: AuthState) => string | undefined;
        email: (state: AuthState) => string | null | undefined;
        isUserAuthedAdmin: (state: AuthState) => boolean;
        isUserAuthedApp: (state: AuthState) => boolean;
        isAuthenticated: (state: AuthState) => boolean;
        isFirekitInit: (state: AuthState) => boolean;
        isUserAdmin: (state: AuthState) => boolean;
        isUserSuperAdmin: (state: AuthState) => boolean;
        isStoreReady: (state: AuthState) => boolean;
    },
    { // Actions
        completeAssessment(adminId: string, taskId: string): Promise<void>;
        initFirekit(): Promise<void>;
        setAuthStateListeners(): void;
        getLegalDoc(docName: string): Promise<any>;
        registerWithEmailAndPassword(params: RegisterParams): Promise<any>;
        logInWithEmailAndPassword(params: LoginParams): Promise<void>;
        initiateLoginWithEmailLink(params: EmailLinkParams): Promise<void>;
        signInWithEmailLink(params: EmailLinkParams): Promise<void>;
        signInWithGooglePopup(): Promise<any>;
        signInWithGoogleRedirect(): Promise<void>;
        signInWithCleverPopup(): Promise<any>;
        signInWithCleverRedirect(): Promise<void>;
        signInWithClassLinkPopup(): Promise<any>;
        signInWithClassLinkRedirect(): Promise<void>;
        initStateFromRedirect(): Promise<void>;
        forceIdTokenRefresh(): Promise<void>;
        sendMyPasswordResetEmail(): Promise<boolean>;
        createNewFamily(params: CreateFamilyParams): Promise<any>;
        createLevanteUsers(userData: UserData): Promise<any>;
        createUsers(userData: UserData): Promise<any>;
    }
>;

export const useAuthStore: AuthStoreDefinition = defineStore('authStore', {
  state: (): AuthState => ({
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
    isReady: false,
  }),

  getters: {
    uid: (state: AuthState): string | undefined => state.firebaseUser.adminFirebaseUser?.uid,
    roarUid: (state: AuthState): string | undefined => state.userClaims?.claims?.roarUid,
    email: (state: AuthState): string | null | undefined => state.firebaseUser.adminFirebaseUser?.email,
    isUserAuthedAdmin: (state: AuthState): boolean => !!state.firebaseUser.adminFirebaseUser,
    isUserAuthedApp: (state: AuthState): boolean => !!state.firebaseUser.appFirebaseUser,
    isAuthenticated: (state: AuthState): boolean =>
      !!state.firebaseUser.adminFirebaseUser && !!state.firebaseUser.appFirebaseUser,

    // Use type assertion as RoarFirekit type might be 'any' or incomplete
    isFirekitInit: (state: AuthState): boolean => !!(state.roarfirekit as any)?.initialized,

    isUserAdmin: (state: AuthState): boolean => {
      const claims = state.userClaims?.claims;
      if (claims?.super_admin || claims?.admin) return true;
      // Provide explicit type for Object.values result if needed, or cast
      if (_isEmpty(_union(...Object.values(claims?.minimalAdminOrgs ?? {} as Record<string, any[]>)))) return false;
      return true;
    },
    isUserSuperAdmin: (state: AuthState): boolean => !!state.userClaims?.claims?.super_admin,
    // Add getter for isReady
    isStoreReady: (state: AuthState): boolean => state.isReady,
  },

  actions: {
    async completeAssessment(adminId: string, taskId: string): Promise<void> {
      // Add null check for roarfirekit
      await (this.roarfirekit as any)?.completeAssessment(adminId, taskId);
    },

    async initFirekit(): Promise<void> {
      this.isReady = false;
      this.spinner = true;
      console.log('[AuthStore TS] initFirekit starting...');
      try {
        const firekitInstance = await initNewFirekit() as RoarFirekit | null;
        this.roarfirekit = firekitInstance;

        const restConfig = (this.roarfirekit as any)?.restConfig;
        if (!restConfig?.admin?.baseURL || !restConfig?.app?.baseURL) {
           console.error('[AuthStore TS] Firekit initialization failed: restConfig base URLs not properly set.');
           this.isReady = false;
           throw new Error('Firekit initialization failed due to missing base URLs.');
        }
        console.log('[AuthStore TS] Firekit initialized successfully with restConfig:', restConfig);
        this.setAuthStateListeners();
        this.isReady = true;
        console.log('[AuthStore TS] initFirekit successful, isReady set to true.');

      } catch (error) {
        console.error('[AuthStore TS] Error initializing Firekit:', error);
        this.roarfirekit = null;
        this.isReady = false;
      } finally {
          this.spinner = false;
          console.log('[AuthStore TS] initFirekit finished, spinner set to:', this.spinner, 'isReady:', this.isReady);
      }
    },

    setAuthStateListeners(): void {
      if (!this.roarfirekit) {
        console.warn('[AuthStore TS] setAuthStateListeners called but roarfirekit is null.');
        return;
      }

      // Use type assertions if RoarFirekit type doesn't directly expose admin/app auth
      const adminAuth = (this.roarfirekit as any)?.admin?.auth;
      const appAuth = (this.roarfirekit as any)?.app?.auth;

      if (this.adminAuthStateListener) this.adminAuthStateListener(); // Unsubscribe previous
      if (adminAuth) {
         this.adminAuthStateListener = onAuthStateChanged(adminAuth, (user) => {
           console.log('[AuthStore TS] Admin auth state changed:', user?.uid);
           this.firebaseUser.adminFirebaseUser = user;
           if (!user) {
             this.userClaims = null;
             this.userData = null;
           }
           // Consider fetching claims/data here if user exists
         });
      } else {
          console.warn('[AuthStore TS] Could not attach admin auth state listener.');
      }

      if (this.appAuthStateListener) this.appAuthStateListener(); // Unsubscribe previous
      if (appAuth) {
          this.appAuthStateListener = onAuthStateChanged(appAuth, (user) => {
            console.log('[AuthStore TS] App auth state changed:', user?.uid);
            this.firebaseUser.appFirebaseUser = user;
          });
      } else {
           console.warn('[AuthStore TS] Could not attach app auth state listener.');
      }
    },

    async getLegalDoc(docName: string): Promise<any> { // Return type might need refinement
      return await (this.roarfirekit as any)?.getLegalDoc(docName);
    },

    async registerWithEmailAndPassword({ email, password, userData }: RegisterParams): Promise<any> {
      return await (this.roarfirekit as any)?.createStudentWithEmailPassword(email, password, userData);
    },

    async logInWithEmailAndPassword({ email, password }: LoginParams): Promise<void> { // Return undefined explicitly
      if (this.isFirekitInit) {
        console.log(`[AuthStore TS] logInWithEmailAndPassword - Attempting login for ${email}`);
        try {
          // Use type assertion if RoarFirekit type is not precise
          const loginResult = await (this.roarfirekit as any)?.logInWithEmailAndPassword({ email, password });
          console.log('[AuthStore TS] logInWithEmailAndPassword - roarfirekit call successful. Result:', loginResult);
          // Return undefined as per previous successful fix
          return undefined;
        } catch (error: any) {
            console.error('[AuthStore TS] logInWithEmailAndPassword - Error during roarfirekit call:', error);
            // Handle specific auth errors if needed
            // Example: check error.code
            throw error;
        }
      } else {
          console.warn('[AuthStore TS] logInWithEmailAndPassword called but firekit not initialized.');
          throw new Error('Authentication service not ready.');
      }
    },

    async initiateLoginWithEmailLink({ email }: EmailLinkParams): Promise<void> {
      if (this.isFirekitInit) {
        const redirectUrl = `${window.location.origin}/auth-email-link`;
        await (this.roarfirekit as any)?.initiateLoginWithEmailLink({ email, redirectUrl });
        window.localStorage.setItem('emailForSignIn', email);
      } else {
           console.warn('[AuthStore TS] initiateLoginWithEmailLink called but firekit not initialized.');
      }
    },

    async signInWithEmailLink({ email, emailLink }: EmailLinkParams): Promise<void> {
      if (this.isFirekitInit && emailLink) {
        await (this.roarfirekit as any)?.signInWithEmailLink({ email, emailLink });
        window.localStorage.removeItem('emailForSignIn');
      } else {
           console.warn('[AuthStore TS] signInWithEmailLink called but firekit not initialized or emailLink missing.');
      }
    },

    async signInWithGooglePopup(): Promise<any> {
      if (this.isFirekitInit) {
        return await (this.roarfirekit as any)?.signInWithPopup(AUTH_SSO_PROVIDERS.GOOGLE);
      }
    },

    async signInWithGoogleRedirect(): Promise<void> {
       // No init check needed for initiateRedirect
      await (this.roarfirekit as any)?.initiateRedirect(AUTH_SSO_PROVIDERS.GOOGLE);
    },

    async signInWithCleverPopup(): Promise<any> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLEVER;
      if (this.isFirekitInit) {
        return await (this.roarfirekit as any)?.signInWithPopup(AUTH_SSO_PROVIDERS.CLEVER);
      }
    },

    async signInWithCleverRedirect(): Promise<void> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLEVER;
      await (this.roarfirekit as any)?.initiateRedirect(AUTH_SSO_PROVIDERS.CLEVER);
    },

    async signInWithClassLinkPopup(): Promise<any> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLASSLINK;
      if (this.isFirekitInit) {
        return await (this.roarfirekit as any)?.signInWithPopup(AUTH_SSO_PROVIDERS.CLASSLINK);
      }
    },

    async signInWithClassLinkRedirect(): Promise<void> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLASSLINK;
      await (this.roarfirekit as any)?.initiateRedirect(AUTH_SSO_PROVIDERS.CLASSLINK);
    },

    async initStateFromRedirect(): Promise<void> {
      console.log('[AuthStore TS] initStateFromRedirect called.');
      // Spinner handled by initFirekit now
      const enableCookiesCallback = () => {
        // Inject router if needed, or ensure it's available globally/via context
        const router = useRouter();
        router.replace({ name: 'EnableCookies' });
      };

      // Check roarfirekit instance directly
      if (this.roarfirekit) {
        console.log('[AuthStore TS] initStateFromRedirect: roarfirekit exists, calling signInFromRedirectResult');
        try {
          const result = await (this.roarfirekit as any)?.signInFromRedirectResult(enableCookiesCallback);
          console.log('[AuthStore TS] initStateFromRedirect: signInFromRedirectResult result:', result);
        } catch(error) {
            console.error("[AuthStore TS] initStateFromRedirect: Error processing redirect result:", error);
        }
      } else {
         // This might be expected if no redirect happened and firekit hasn't been init yet
         console.warn("[AuthStore TS] initStateFromRedirect called before roarfirekit instance was created.");
      }
    },

    async forceIdTokenRefresh(): Promise<void> {
      await (this.roarfirekit as any)?.forceIdTokenRefresh();
    },

    async sendMyPasswordResetEmail(): Promise<boolean> {
      if (this.email) {
        await (this.roarfirekit as any)?.sendPasswordResetEmail(this.email);
        return true;
      } else {
        console.warn('[AuthStore TS] sendMyPasswordResetEmail: Logged in user does not have an associated email.');
        return false;
      }
    },

    async createNewFamily({ careTakerEmail, careTakerPassword, careTakerData, students, isTestData = false }: CreateFamilyParams): Promise<any> {
      return await (this.roarfirekit as any)?.createNewFamily(careTakerEmail, careTakerPassword, careTakerData, students, isTestData);
    },

    // ------------------ LEVANTE ------------------
    async createLevanteUsers(userData: UserData): Promise<any> {
      return await (this.roarfirekit as any)?.createLevanteUsersWithEmailPassword(userData);
    },

    async createUsers(userData: UserData): Promise<any> {
      return await (this.roarfirekit as any)?.createUsers(userData);
    },
  },

  // Use explicit paths for persistence
  persist: {
    storage: sessionStorage,
    paths: [
      'firebaseUser.adminFirebaseUser.uid',
      'firebaseUser.adminFirebaseUser.email',
      'firebaseUser.appFirebaseUser.uid',
      'firebaseUser.appFirebaseUser.email',
      'userData',
      'userClaims',
      'adminOrgs',
      'cleverOAuthRequested',
      'classLinkOAuthRequested',
      'ssoProvider',
      'showOptionalAssessments',
    ],
    debug: false,
  },
});

// HMR
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
