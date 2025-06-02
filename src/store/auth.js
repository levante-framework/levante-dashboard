import { acceptHMRUpdate, defineStore } from "pinia";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "vue-router";
import _isEmpty from "lodash/isEmpty";
import _union from "lodash/union";
import { initNewFirekit } from "../firebaseInit";
import { AUTH_SSO_PROVIDERS } from "../constants/auth";
import posthogInstance from "@/plugins/posthog";
import { logger } from "@/logger";

export const useAuthStore = () => {
  const store = defineStore("authStore", {
    id: "authStore",
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
        authStateListener: null,
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
        return (
          Boolean(state.firebaseUser.adminFirebaseUser) &&
          Boolean(state.firebaseUser.appFirebaseUser)
        );
      },
      isFirekitInit: (state) => {
        return Boolean(state.roarfirekit?.initialized && state.roarfirekit?.project?.auth);
      },
      isUserAdmin: (state) => {
        if (
          state.userClaims?.claims?.super_admin ||
          state.userClaims?.claims?.admin
        )
          return true;
        if (
          _isEmpty(
            _union(
              ...Object.values(
                state.userClaims?.claims?.minimalAdminOrgs ?? {},
              ),
            ),
          )
        )
          return false;
        return true;
      },
      isUserSuperAdmin: (state) =>
        Boolean(state.userClaims?.claims?.super_admin),
    },
    actions: {
      async initFirekit() {
        console.log('Auth store: Starting firekit initialization...');
        try {
          this.roarfirekit = await initNewFirekit();
          console.log('Auth store: Firekit initialized successfully:', {
            type: this.roarfirekit?.constructor?.name,
            initialized: this.roarfirekit?.initialized,
            hasProject: !!this.roarfirekit?.project,
            projectAuth: !!this.roarfirekit?.project?.auth,
          });
          
          // Wait for initialization to complete
          if (!this.roarfirekit?.initialized || !this.roarfirekit?.project?.auth) {
            console.warn('Auth store: Waiting for firekit to fully initialize...');
            let attempts = 0;
            while ((!this.roarfirekit?.initialized || !this.roarfirekit?.project?.auth) && attempts < 30) {
              await new Promise(resolve => setTimeout(resolve, 200));
              attempts++;
              console.log(`Auth store: Waiting for firekit initialization, attempt ${attempts}`);
            }
            
            if (!this.roarfirekit?.initialized || !this.roarfirekit?.project?.auth) {
              console.error('Auth store: Firekit failed to initialize after waiting');
              return;
            }
          }
          
          console.log('Auth store: Firekit confirmed ready, setting up auth listeners...');
          this.setAuthStateListeners();
        } catch (error) {
          console.error("Error initializing Firekit:", error);
        }
      },
      setAuthStateListeners() {
        console.log('Auth store: Setting up auth state listeners...');
        
        if (!this.roarfirekit?.project?.auth) {
          console.error('Auth store: Cannot set up auth listeners - no auth instance found');
          return;
        }

        try {
          this.authStateListener = onAuthStateChanged(
            this.roarfirekit.project.auth,
            async (user) => {
              if (user) {
                this.localFirekitInit = true;
                // For merged architecture, both admin and app users are the same
                this.firebaseUser.adminFirebaseUser = user;
                this.firebaseUser.appFirebaseUser = user;
                logger.setUser(user);
              } else {
                this.firebaseUser.adminFirebaseUser = null;
                this.firebaseUser.appFirebaseUser = null;
                logger.setUser(null);
              }
            },
          );
          
          console.log('Auth store: Auth state listeners set up successfully');
        } catch (error) {
          console.error('Auth store: Error setting up auth state listeners:', error);
        }
      },
      async completeAssessment(adminId, taskId) {
        await this.roarfirekit.completeAssessment(adminId, taskId);
      },
      async getLegalDoc(docName) {
        return await this.roarfirekit.getLegalDoc(docName);
      },
      async registerWithEmailAndPassword({ email, password, userData }) {
        return this.roarfirekit.createStudentWithEmailPassword(
          email,
          password,
          userData,
        );
      },
      async logInWithEmailAndPassword({ email, password }) {
        if (this.isFirekitInit) {
          return this.roarfirekit
            .logInWithEmailAndPassword({ email, password })
            .then(async () => {
              // Wait for the firekit to have the ID token before resolving
              console.log('Auth store: Login successful, waiting for ID token...');
              let attempts = 0;
              while (!this.roarfirekit.idToken && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
                console.log(`Auth store: Waiting for ID token, attempt ${attempts}`);
              }
              
              if (!this.roarfirekit.idToken) {
                console.warn('Auth store: ID token not available after login');
              } else {
                console.log('Auth store: ID token available, login complete');
              }
            })
            .catch((error) => {
              console.error("Error signing in:", error);
              throw error;
            });
        }
      },
      async initiateLoginWithEmailLink({ email }) {
        if (this.isFirekitInit) {
          const redirectUrl = `${window.location.origin}/auth-email-link`;
          return this.roarfirekit
            .initiateLoginWithEmailLink({ email, redirectUrl })
            .then(() => {
              window.localStorage.setItem("emailForSignIn", email);
            });
        }
      },
      async signInWithEmailLink({ email, emailLink }) {
        if (this.isFirekitInit) {
          return this.roarfirekit
            .signInWithEmailLink({ email, emailLink })
            .then(() => {
              window.localStorage.removeItem("emailForSignIn");
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
          router.replace({ name: "EnableCookies" });
        };
        
        if (this.isFirekitInit) {
          console.log('Auth store: Checking for redirect result...');
          
          // For merged architecture, redirect handling is simpler
          if (typeof this.roarfirekit.signInFromRedirectResult === 'function') {
            console.log('Auth store: Using signInFromRedirectResult method');
            try {
              return await this.roarfirekit
                .signInFromRedirectResult(enableCookiesCallback)
                .then((result) => {
                  if (result !== null) {
                    this.spinner = true;
                  } else {
                    this.spinner = false;
                  }
                });
            } catch (error) {
              console.error('Auth store: Error in signInFromRedirectResult:', error);
              this.spinner = false;
            }
          } else {
            console.log('Auth store: No redirect result method found - this is normal for merged architecture');
            this.spinner = false;
            return Promise.resolve(null);
          }
        } else {
          console.warn('Firekit not initialized, cannot check redirect result');
          this.spinner = false;
        }
      },
      async forceIdTokenRefresh() {
        await this.roarfirekit.forceIdTokenRefresh();
      },
      async sendMyPasswordResetEmail() {
        if (this.email) {
          return await this.roarfirekit
            .sendPasswordResetEmail(this.email)
            .then(() => {
              return true;
            });
        } else {
          console.warn(
            "Logged in user does not have an associated email. Unable to send password reset email",
          );
          return false;
        }
      },
      async createUsers(userData) {
        return this.roarfirekit.createUsers(userData);
      },
      async signOut() {
        console.log("PostHog Reset (explicit signOut)");
        posthogInstance.reset();
        if (this.isFirekitInit) {
          return this.roarfirekit.signOut();
        }
      },
      setUserData(userData) {
        this.userData = userData;
      },
      setUserClaims(userClaims) {
        this.userClaims = userClaims;
      },
    },
    persist: {
      storage: sessionStorage,
      paths: ["firebaseUser", "ssoProvider"],
      debug: false,
    },
  });
  return store();
};

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
