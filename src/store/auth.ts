import { acceptHMRUpdate, defineStore } from 'pinia';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'vue-router';
import _isEmpty from 'lodash/isEmpty';
import _union from 'lodash/union';
import { initNewFirekit } from '../firebaseInit';
import { AUTH_SSO_PROVIDERS } from '../constants/auth';

interface FirebaseUser {
  adminFirebaseUser: User | null;
  appFirebaseUser: User | null;
}

interface UserClaims {
  claims?: {
    roarUid?: string;
    super_admin?: boolean;
    admin?: boolean;
    minimalAdminOrgs?: Record<string, string[]>;
  };
}

interface AuthState {
  spinner: boolean;
  firebaseUser: FirebaseUser;
  adminOrgs: any | null;
  roarfirekit: any | null;
  userData: any | null;
  userClaims: UserClaims | null;
  cleverOAuthRequested: boolean;
  classLinkOAuthRequested: boolean;
  routeToProfile: boolean;
  ssoProvider: string | null;
  showOptionalAssessments: boolean;
  adminAuthStateListener: (() => void) | null;
  appAuthStateListener: (() => void) | null;
}

interface UserData {
  email: string;
  password: string;
  userData: any;
}

interface EmailLinkData {
  email: string;
  emailLink?: string;
}

interface FamilyData {
  careTakerEmail: string;
  careTakerPassword: string;
  careTakerData: any;
  students: any[];
  isTestData?: boolean;
}

export const useAuthStore = defineStore('authStore', {
  state: (): AuthState => {
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
    uid: (state: AuthState): string | undefined => {
      return state.firebaseUser.adminFirebaseUser?.uid;
    },
    roarUid: (state: AuthState): string | undefined => {
      return state.userClaims?.claims?.roarUid;
    },
    email: (state: AuthState): string | undefined => {
      return state.firebaseUser.adminFirebaseUser?.email ?? undefined;
    },
    isUserAuthedAdmin: (state: AuthState): boolean => {
      return Boolean(state.firebaseUser.adminFirebaseUser);
    },
    isUserAuthedApp: (state: AuthState): boolean => {
      return Boolean(state.firebaseUser.appFirebaseUser);
    },
    isAuthenticated: (state: AuthState): boolean => {
      return Boolean(state.firebaseUser.adminFirebaseUser) && Boolean(state.firebaseUser.appFirebaseUser);
    },
    isFirekitInit: (state: AuthState): boolean => {
      return Boolean(state.roarfirekit?.initialized);
    },
    isUserAdmin: (state: AuthState): boolean => {
      if (state.userClaims?.claims?.super_admin || state.userClaims?.claims?.admin) return true;
      if (_isEmpty(_union(...Object.values(state.userClaims?.claims?.minimalAdminOrgs ?? {})))) return false;
      return true;
    },
    isUserSuperAdmin: (state: AuthState): boolean => Boolean(state.userClaims?.claims?.super_admin),
  },
  actions: {
    async completeAssessment(adminId: string, taskId: string): Promise<void> {
      await this.roarfirekit.completeAssessment(adminId, taskId);
    },
    async initFirekit(): Promise<void> {
      console.log('Auth store: Initializing Firekit');
      try {
        this.roarfirekit = await initNewFirekit();
        console.log('Auth store: Firekit initialized successfully');
        await this.setAuthStateListeners();
        console.log('Auth store: Auth state listeners set');
      } catch (error) {
        console.error('Error initializing Firekit:', error);
        throw error;
      }
    },
    async setAuthStateListeners(): Promise<void> {
      console.log('Setting up auth state listeners');
      
      if (!this.roarfirekit?.initialized) {
        console.error('Cannot set auth state listeners: Firekit not initialized');
        return;
      }
      
      // Clear existing listeners if any
      if (this.adminAuthStateListener) {
        this.adminAuthStateListener();
      }
      if (this.appAuthStateListener) {
        this.appAuthStateListener();
      }

      // Set up new listeners
      this.adminAuthStateListener = onAuthStateChanged(this.roarfirekit.admin.auth, async (user: User | null) => {
        console.log('Admin auth state changed:', user ? 'User logged in' : 'User logged out');
        if (user) {
          this.firebaseUser.adminFirebaseUser = user;
          try {
            // Force token refresh to ensure permissions are up to date
            await user.getIdToken(true);
            const tokenResult = await user.getIdTokenResult();
            const claims = tokenResult.claims as {
              roarUid?: string;
              super_admin?: boolean;
              admin?: boolean;
              minimalAdminOrgs?: Record<string, string[]>;
            };
            this.userClaims = { claims };
          } catch (error) {
            console.error('Error getting user claims:', error);
          }
        } else {
          this.firebaseUser.adminFirebaseUser = null;
          this.userClaims = null;
        }
      });

      this.appAuthStateListener = onAuthStateChanged(this.roarfirekit.app.auth, async (user: User | null) => {
        console.log('App auth state changed:', user ? 'User logged in' : 'User logged out');
        if (user) {
          this.firebaseUser.appFirebaseUser = user;
        } else {
          this.firebaseUser.appFirebaseUser = null;
        }
      });
    },
    async getLegalDoc(docName: string): Promise<any> {
      return await this.roarfirekit.getLegalDoc(docName);
    },
    async registerWithEmailAndPassword({ email, password, userData }: UserData): Promise<any> {
      return this.roarfirekit.createStudentWithEmailPassword(email, password, userData);
    },
    async logInWithEmailAndPassword({ email, password }: UserData): Promise<void> {
      if (this.isFirekitInit) {
        return this.roarfirekit
          .logInWithEmailAndPassword({ email, password })
          .then(() => {})
          .catch((error: Error) => {
            console.error('Error signing in:', error);
            throw error;
          });
      }
    },
    async initiateLoginWithEmailLink({ email }: EmailLinkData): Promise<void> {
      if (this.isFirekitInit) {
        const redirectUrl = `${window.location.origin}/auth-email-link`;
        return this.roarfirekit.initiateLoginWithEmailLink({ email, redirectUrl }).then(() => {
          window.localStorage.setItem('emailForSignIn', email);
        });
      }
    },
    async signInWithEmailLink({ email, emailLink }: EmailLinkData): Promise<void> {
      if (this.isFirekitInit) {
        return this.roarfirekit.signInWithEmailLink({ email, emailLink }).then(() => {
          window.localStorage.removeItem('emailForSignIn');
        });
      }
    },
    async signInWithGooglePopup(): Promise<any> {
      if (this.isFirekitInit) {
        return this.roarfirekit.signInWithPopup(AUTH_SSO_PROVIDERS.GOOGLE);
      }
    },
    async signInWithGoogleRedirect(): Promise<void> {
      return this.roarfirekit.initiateRedirect(AUTH_SSO_PROVIDERS.GOOGLE);
    },
    async signInWithCleverPopup(): Promise<any> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLEVER;
      if (this.isFirekitInit) {
        return this.roarfirekit.signInWithPopup(AUTH_SSO_PROVIDERS.CLEVER);
      }
    },
    async signInWithCleverRedirect(): Promise<void> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLEVER;
      return this.roarfirekit.initiateRedirect(AUTH_SSO_PROVIDERS.CLEVER);
    },
    async signInWithClassLinkPopup(): Promise<any> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLASSLINK;
      if (this.isFirekitInit) {
        return this.roarfirekit.signInWithPopup(AUTH_SSO_PROVIDERS.CLASSLINK);
      }
    },
    async signInWithClassLinkRedirect(): Promise<void> {
      this.ssoProvider = AUTH_SSO_PROVIDERS.CLASSLINK;
      return this.roarfirekit.initiateRedirect(AUTH_SSO_PROVIDERS.CLASSLINK);
    },
    async initStateFromRedirect(): Promise<void> {
      this.spinner = true;
      const enableCookiesCallback = () => {
        const router = useRouter();
        router.replace({ name: 'EnableCookies' });
      };
      if (this.isFirekitInit) {
        return await this.roarfirekit.signInFromRedirectResult(enableCookiesCallback).then((result: any) => {
          if (result !== null) {
            this.spinner = true;
          } else {
            this.spinner = false;
          }
        });
      }
    },
    async forceIdTokenRefresh(): Promise<void> {
      await this.roarfirekit.forceIdTokenRefresh();
    },
    async sendMyPasswordResetEmail(): Promise<boolean> {
      if (this.email) {
        return await this.roarfirekit.sendPasswordResetEmail(this.email).then(() => true);
      } else {
        console.warn('Logged in user does not have an associated email. Unable to send password reset email');
        return false;
      }
    },
    async createNewFamily({ careTakerEmail, careTakerPassword, careTakerData, students, isTestData = false }: FamilyData): Promise<any> {
      return this.roarfirekit.createNewFamily(careTakerEmail, careTakerPassword, careTakerData, students, isTestData);
    },
    async createLevanteUsers(userData: any): Promise<any> {
      return this.roarfirekit.createLevanteUsersWithEmailPassword(userData);
    },
    async createUsers(userData: any): Promise<any> {
      return this.roarfirekit.createUsers(userData);
    },
  },
  persist: {
    storage: sessionStorage,
    debug: false,
    paths: [
      'spinner',
      'adminOrgs',
      'userData',
      'userClaims',
      'cleverOAuthRequested',
      'classLinkOAuthRequested',
      'routeToProfile',
      'ssoProvider',
      'showOptionalAssessments'
    ],
    serializer: {
      serialize: (state) => {
        const serializedState = {
          spinner: state.spinner,
          adminOrgs: state.adminOrgs ? JSON.parse(JSON.stringify(state.adminOrgs)) : null,
          userData: state.userData ? JSON.parse(JSON.stringify(state.userData)) : null,
          userClaims: state.userClaims ? JSON.parse(JSON.stringify(state.userClaims)) : null,
          cleverOAuthRequested: state.cleverOAuthRequested,
          classLinkOAuthRequested: state.classLinkOAuthRequested,
          routeToProfile: state.routeToProfile,
          ssoProvider: state.ssoProvider,
          showOptionalAssessments: state.showOptionalAssessments
        };
        return JSON.stringify(serializedState);
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          firebaseUser: {
            adminFirebaseUser: null,
            appFirebaseUser: null,
          },
          roarfirekit: null,
          adminAuthStateListener: null,
          appAuthStateListener: null,
        };
      }
    }
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
} 