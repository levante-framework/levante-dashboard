import { acceptHMRUpdate, defineStore } from 'pinia';
import { onAuthStateChanged, User, Unsubscribe } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { initNewFirekit } from '../firebaseInit';
import { AUTH_SSO_PROVIDERS } from '../constants/auth';
import posthogInstance from '@/plugins/posthog';
import { logger } from '@/logger';
import { RoarFirekit } from '@levante-framework/firekit';
import { type Role } from '@levante-framework/permissions-core';

interface FirebaseUser {
  adminFirebaseUser: User | null;
}

interface UserClaims {
  claims: {
    roarUid?: string;
    super_admin?: boolean;
    admin?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface AuthState {
  spinner: boolean;
  firebaseUser: FirebaseUser;
  roarfirekit: RoarFirekit | null;
  userData: unknown;
  userClaims: UserClaims | null;
  routeToProfile: boolean;
  ssoProvider: string | null;
  showOptionalAssessments: boolean;
  showSideBar: boolean;
  adminAuthStateListener: Unsubscribe | null;
  sites: unknown[];
  currentSite: string | null;
  shouldUsePermissions: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface EmailLinkCredentials {
  email: string;
  emailLink: string;
}

export const useAuthStore = defineStore('authStore', {
  state: (): AuthState => {
    return {
      spinner: false,
      firebaseUser: {
        adminFirebaseUser: null,
      },
      roarfirekit: null,
      userData: null, 
      userClaims: null,
      routeToProfile: false,
      ssoProvider: null,
      showOptionalAssessments: false,
      showSideBar: false,
      adminAuthStateListener: null,
      sites: [],
      currentSite: null,
      shouldUsePermissions: false,
    };
  },
  getters: {
    uid: (state): string | undefined => {
      return state.firebaseUser.adminFirebaseUser?.uid;
    },
    roarUid: (state): string | undefined => {
      return state.userClaims?.claims?.roarUid;
    },
    email: (state): string | undefined => {
      return state.firebaseUser.adminFirebaseUser?.email;
    },
    isUserAuthedAdmin: (state): boolean => {
      return Boolean(state.firebaseUser.adminFirebaseUser);
    },
    isAuthenticated: (state): boolean => {
      return Boolean(state.firebaseUser.adminFirebaseUser);
    },
    isFirekitInit: (state): boolean => {
      return state.roarfirekit?.initialized ?? false;
    },
    isUserAdmin: (state): boolean => {
      return Boolean(state.userClaims?.claims?.super_admin || state.userClaims?.claims?.admin);
    },
    isUserSuperAdmin: (state): boolean => Boolean(state.userClaims?.claims?.super_admin),
  },
  actions: {
    async initFirekit(): Promise<void> {
      try {
        this.roarfirekit = await initNewFirekit();
        this.setAuthStateListeners();
      } catch (error) {
        // @TODO: Improve error handling as this is a critical error.
        console.error('Error initializing Firekit:', error);
      }
    },
    setAuthStateListeners(): void {
      this.adminAuthStateListener = onAuthStateChanged(
        this.roarfirekit?.admin.auth ?? null,
        async (user: User | null) => {
          if (user) {
            this.firebaseUser.adminFirebaseUser = user;
            logger.setUser(user);
          } else {
            this.firebaseUser.adminFirebaseUser = null;
            logger.setUser(null);
          }
        },
      );
    },
    async completeAssessment(adminId: string, taskId: string): Promise<void> {
      await this.roarfirekit?.completeAssessment(adminId, taskId);
    },
    async getLegalDoc(docName: string): Promise<unknown> {
      return await this.roarfirekit?.getLegalDoc(docName);
    },
    async logInWithEmailAndPassword({ email, password }: LoginCredentials): Promise<void> {
      if (this.isFirekitInit) {
        return this.roarfirekit
          ?.logInWithEmailAndPassword({ email, password })
          .then(() => {})
          .catch((error) => {
            console.error('Error signing in:', error);
            throw error;
          });
      }
    },
    async initiateLoginWithEmailLink({ email }: Pick<LoginCredentials, 'email'>): Promise<void> {
      if (this.isFirekitInit) {
        const redirectUrl = `${window.location.origin}/auth-email-link`;
        return this.roarfirekit?.initiateLoginWithEmailLink({ email, redirectUrl }).then(() => {
          window.localStorage.setItem('emailForSignIn', email);
        });
      }
    },
    async signInWithEmailLink({ email, emailLink }: EmailLinkCredentials): Promise<void> {
      if (this.isFirekitInit) {
        return this.roarfirekit?.signInWithEmailLink({ email, emailLink }).then(() => {
          window.localStorage.removeItem('emailForSignIn');
        });
      }
    },
    async signInWithGooglePopup(): Promise<unknown> {
      if (this.isFirekitInit) {
        return this.roarfirekit?.signInWithPopup(AUTH_SSO_PROVIDERS.GOOGLE);
      }
    },
    async signInWithGoogleRedirect(): Promise<void> {
      return this.roarfirekit?.initiateRedirect(AUTH_SSO_PROVIDERS.GOOGLE);
    },
    async initStateFromRedirect(): Promise<unknown> {
      this.spinner = true;
      const enableCookiesCallback = (): void => {
        const router = useRouter();
        router.replace({ name: 'EnableCookies' });
      };
      if (this.isFirekitInit) {
        return await this.roarfirekit?.signInFromRedirectResult(enableCookiesCallback).then((result) => {
          // If the result is null, then no redirect operation was called.
          if (result !== null) {
            this.spinner = true;
          } else {
            this.spinner = false;
          }
        });
      }
    },
    async forceIdTokenRefresh(): Promise<void> {
      await this.roarfirekit?.forceIdTokenRefresh();
    },
    async sendMyPasswordResetEmail(): Promise<boolean> {
      if (this.email) {
        return (
          (await this.roarfirekit?.sendPasswordResetEmail(this.email).then(() => {
            return true;
          })) ?? false
        );
      } else {
        console.warn('Logged in user does not have an associated email. Unable to send password reset email');
        return false;
      }
    },
    async createUsers(userData: unknown): Promise<unknown> {
      return this.roarfirekit?.createUsers(userData);
    },
    async signOut(): Promise<void> {
      console.log('PostHog Reset (explicit signOut)');
      posthogInstance.reset();
      if (this.isFirekitInit) {
        return this.roarfirekit?.signOut();
      }
    },
    setUserData(userData: { roles: { siteId: string; role: string; siteName: string }[] }): void {
      this.userData = userData;
      this.sites = userData.roles.map((role: { siteId: string; role: string; siteName: string }) => ({siteId: role.siteId, siteName: role.siteName}));
      this.currentSite = userData.roles[0].siteId;
    },
    setUserClaims(userClaims: UserClaims | null): void {
      this.userClaims = userClaims;
      this.shouldUsePermissions = userClaims?.claims.useNewPermissions ?? false;
    },
    setShowSideBar(showSideBar: boolean): void {
      this.showSideBar = showSideBar;
    },
  },
  persist: {
    storage: sessionStorage,
    paths: ['firebaseUser', 'ssoProvider'],
    debug: false,
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
