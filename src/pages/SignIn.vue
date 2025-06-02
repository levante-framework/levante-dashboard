<template>
  <div v-if="spinner" class="loading-blur">
    <AppSpinner />
  </div>
  <div id="signin-container">
    <section id="signin">
      <header>
        <div class="signin-logo">
          <PvImage
            src="/LEVANTE/Levante_Logo.png"
            alt="LEVANTE Logo"
            width="200"
          />
        </div>
      </header>
      <h1 v-if="!isLevante">{{ $t("pageSignIn.welcome") }}</h1>
      <section class="signin-options">
        <section class="signin-option-container signin-option-userpass">
          <h4 class="signin-option-title">{{ $t("pageSignIn.login") }}</h4>
          <div id="languageSelect" class="m-4 flex justify-content-center">
            <LanguageSelector class="w-7" />
          </div>
          <SignIn
            :invalid="incorrect"
            @submit="authWithEmail"
            @update:email="email = $event"
          />
        </section>
        <section v-if="isLevante" class="w-full mb-2">
          <!-- <p class="text-center m-auto">
            Are you an Admin? Click
            <span class="underline text-red-700 cursor-pointer" @click="toggleAdminSignIn">Here</span> to Sign In
          </p> -->
          <i18n-t
            keypath="pageSignIn.adminPrompt"
            tag="p"
            class="text-center m-auto"
          >
            <template #action>
              <span
                class="underline text-red-700 cursor-pointer"
                @click="toggleAdminSignIn"
                >{{ $t("pageSignIn.adminAction") }}</span
              >
            </template>
          </i18n-t>
        </section>
        <section
          v-if="adminSignIn || !isLevante"
          class="flex flex-column w-full"
        >
          <h4
            class="flex mb-3 mt-1 align-content-center justify-content-center flex-wrap-reverse font-bold text-md text-500"
          >
            {{ $t("pageSignIn.loginWith") }}
          </h4>
          <div
            class="flex flex-row align-content-center justify-content-center w-full"
          >
            <PvButton
              label="Sign in with Google"
              class="flex surface-0 p-1 border-black-alpha-10 w-3 ml-2 mr-2 text-center text-black justify-content-center hover:border-primary hover:surface-ground"
              style="border-radius: 3rem; height: 3rem; color: black !important"
              @click="authWithGoogle"
            >
              <img
                src="../assets/provider-google-logo.svg"
                alt="The Google Logo"
                class="flex mr-2 w-2"
              />
              <span>Google</span>
            </PvButton>
          </div>
          <p class="text-xs">*{{ $t("pageSignIn.adminInfoPrompt") }}</p>
        </section>
        <!-- <section class="signin-option-container signin-option-providers">
          <div class="flex flex-row justify-content-center w-full">
            <p class="signin-option-title text-sm">Don't have an account yet?</p>
            <PvButton label="Register" class="signin-button w-3" @click="router.push({ name: 'Register' })" />
          </div>
        </section> -->
      </section>
      <footer style="display: none">
        <!-- TODO: figure out a link for this -->
        <a href="#trouble">{{ $t("pageSignIn.havingTrouble") }}</a>
      </footer>
    </section>
  </div>
  <RoarModal
    :is-enabled="warningModalOpen"
    title="Email is already associated with an account"
    subtitle=""
    icon="pi-exclamation-triangle"
    small
    @modal-closed="handleWarningModalClose"
  >
    <template #default>
      The email <span class="font-bold">{{ email }}</span> is already in use
      using
      {{
        displaySignInMethods.slice(0, -1).join(", ") +
        " or " +
        displaySignInMethods.slice(-1)
      }}. If this is you, click to sign in below.
      <div class="flex align-items-center flex-column gap-2 my-2">
        <div v-if="signInMethods.includes('google')" class="flex">
          <PvButton
            label="Sign in with Google"
            class="flex surface-0 p-1 mr-1 border-black-alpha-10 text-center justify-content-center hover:border-primary hover:surface-ground"
            style="border-radius: 3rem; height: 3rem"
            @click="authWithGoogle"
          >
            <img
              src="../assets/provider-google-logo.svg"
              alt="The Google Logo"
              class="flex mr-2 w-2"
            />
            <span>Google</span>
          </PvButton>
        </div>
        <div
          v-if="signInMethods.includes('password')"
          class="flex flex-row gap-2"
        >
          <PvPassword
            v-model="modalPassword"
            placeholder="Password"
            :feedback="false"
          ></PvPassword>
          <PvButton
            class="flex p-3 border-none border-round hover:bg-black-alpha-20"
            :label="$t('authSignIn.buttonLabel') + ' &rarr;'"
            @click="
              authWithEmail({
                email,
                password: modalPassword,
                useLink: false,
                usePassword: true,
              })
            "
          />
        </div>
      </div>
      You will then be directed to your profile page where you can link
      different authentication providers.
    </template>
    <template #footer>
      <PvButton
        tabindex="0"
        class="border-none border-round bg-white text-primary p-2 hover:surface-200"
        text
        label="Back to Sign In"
        outlined
        @click="handleWarningModalClose"
      ></PvButton>
    </template>
  </RoarModal>
  
  <!-- Temporary Clear Session Button -->
  <div style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
    <button 
      @click="clearSession" 
      style="background: red; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;"
    >
      Clear Session & Sign Out
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref, toRaw, onBeforeUnmount, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import PvButton from "primevue/button";
import PvImage from "primevue/image";
import PvPassword from "primevue/password";
import { useAuthStore } from "@/store/auth";
import { isMobileBrowser } from "@/helpers";
import { fetchDocById } from "@/helpers/query/utils";
import { isLevante } from "@/helpers";
import { AUTH_SSO_PROVIDERS } from "@/constants/auth";
import { APP_ROUTES } from "@/constants/routes";
import RoarModal from "@/components/modals/RoarModal.vue";
import SignIn from "@/components/auth/SignIn.vue";
import LanguageSelector from "@/components/LanguageSelector.vue";

const incorrect = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const adminSignIn = ref(false);
const hasRouted = ref(false); // Add guard to prevent multiple routing

const { spinner, ssoProvider, routeToProfile, roarfirekit } =
  storeToRefs(authStore);
const warningModalOpen = ref(false);

// Use a more specific subscription that only triggers when uid changes
let routingTimeout = null;
let lastUid = null;

// Watch only the uid property instead of the entire store
const currentUid = computed(() => authStore.uid);

watch(currentUid, (newUid, oldUid) => {
  console.log('SignIn: UID changed from', oldUid, 'to', newUid);
  
  // Only process if the uid actually changed
  if (newUid === lastUid) {
    console.log('SignIn: UID unchanged, skipping processing');
    return;
  }
  
  lastUid = newUid;
  
  // Clear any existing routing timeout
  if (routingTimeout) {
    clearTimeout(routingTimeout);
    routingTimeout = null;
  }
  
  if (newUid && !hasRouted.value) {
    console.log('SignIn: User authenticated, waiting for userClaims before routing...');
    
    // Wait for userClaims to be fetched before routing
    const waitForUserClaims = async () => {
      let attempts = 0;
      const maxAttempts = 50; // 10 seconds max wait
      
      while (attempts < maxAttempts && !hasRouted.value) {
        // Check if userClaims are available
        if (authStore.userClaims) {
          console.log('SignIn: UserClaims available, proceeding with routing...');
          break;
        }
        
        // Wait 200ms before checking again
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
        
        if (attempts % 10 === 0) {
          console.log(`SignIn: Still waiting for userClaims, attempt ${attempts}/${maxAttempts}`);
        }
      }
      
      if (attempts >= maxAttempts) {
        console.warn('SignIn: Timeout waiting for userClaims, proceeding with routing anyway');
      }
      
      // Proceed with routing if we haven't already routed
      if (authStore.uid && !hasRouted.value && authStore.uid === lastUid) {
        console.log('SignIn: Auth state stable, proceeding with routing...');
        hasRouted.value = true; // Set guard to prevent multiple routing
        spinner.value = false; // Hide spinner before routing
        
        if (ssoProvider.value) {
          console.log('SignIn: Routing to SSO');
          router.push({ path: APP_ROUTES.SSO });
        } else if (routeToProfile.value) {
          console.log('SignIn: Routing to profile');
          router.push({ path: APP_ROUTES.ACCOUNT_PROFILE });
        } else {
          console.log('SignIn: Routing to home');
          router.push({ path: APP_ROUTES.HOME });
        }
      } else {
        console.log('SignIn: Auth state changed during delay, canceling routing');
      }
    };
    
    // Start waiting for userClaims
    waitForUserClaims();
  } else if (!newUid && hasRouted.value) {
    console.log('SignIn: User logged out, resetting routing guard');
    hasRouted.value = false;
    lastUid = null;
  }
}, { immediate: true });

const toggleAdminSignIn = () => {
  adminSignIn.value = !adminSignIn.value;
};

const authWithGoogle = () => {
  if (isMobileBrowser()) {
    authStore.signInWithGoogleRedirect();
  } else {
    spinner.value = true; // Show spinner during login
    
    authStore
      .signInWithGooglePopup()
      .then(async () => {
        console.log('SignIn: Google login successful, user data will be fetched by App.vue');
        
        // Don't fetch user data here - App.vue handles this
        // This prevents race conditions and duplicate API calls
        
        // Don't set spinner to false here - let the auth store subscription handle routing
      })
      .catch((e) => {
        const errorCode = e.code;
        spinner.value = false; // Hide spinner on error
        hasRouted.value = false; // Reset routing guard on error
        
        if (errorCode === "auth/email-already-in-use") {
          // User tried to register with an email that is already linked to a firebase account.
          openWarningModal();
        } else {
          console.log("caught error", e);
        }
      });
  }
};

const modalPassword = ref("");

const authWithEmail = async (state) => {
  // If username is supplied instead of email
  // turn it into our internal auth email
  incorrect.value = false;
  let creds = toRaw(state);
  if (creds.useLink && !creds.usePassword) {
    authStore.initiateLoginWithEmailLink({ email: creds.email }).then(() => {
      router.push({ name: "AuthEmailSent" });
    });
  } else {
    if (!creds.email.includes("@")) {
      creds.email = `${creds.email}@roar-auth.com`;
    }

    spinner.value = true; // Show spinner during login
    
    await authStore
      .logInWithEmailAndPassword(creds)
      .then(async () => {
        console.log('SignIn: Login successful, user data will be fetched by App.vue');
        console.log('SignIn: Firekit state:', {
          hasFirekit: !!authStore.roarfirekit,
          initialized: authStore.roarfirekit?.initialized,
          hasIdToken: !!authStore.roarfirekit?.idToken,
          uid: authStore.uid,
          roarUid: authStore.roarUid
        });
        
        // Don't fetch user data here - App.vue handles this
        // This prevents race conditions and duplicate API calls
        
        // Don't set spinner to false here - let the auth store subscription handle routing
        // The spinner will be hidden when the route changes
      })
      .catch((e) => {
        spinner.value = false; // Hide spinner on error
        hasRouted.value = false; // Reset routing guard on error
        incorrect.value = true;
        if (["auth/user-not-found", "auth/wrong-password"].includes(e.code)) {
          return;
        } else {
          throw e;
        }
      });
  }
};

const handleWarningModalClose = () => {
  authStore.routeToProfile = true;
  warningModalOpen.value = false;
};

const email = ref("");

const signInMethods = ref([]);

const openWarningModal = async () => {
  signInMethods.value = await roarfirekit.value.fetchEmailAuthMethods(
    email.value,
  );
  warningModalOpen.value = true;
};

const displaySignInMethods = computed(() => {
  return signInMethods.value.map((method) => {
    if (method === "password") return "Password";
    if (method === AUTH_SSO_PROVIDERS.GOOGLE) return "Google";
  });
});

const clearSession = () => {
  authStore.clearSession();
};

onMounted(() => {
  document.body.classList.add("page-signin");
  hasRouted.value = false; // Reset routing guard on mount
});

onBeforeUnmount(() => {
  document.body.classList.remove("page-signin");
  hasRouted.value = false; // Reset routing guard on unmount
  
  // Clean up routing timeout
  if (routingTimeout) {
    clearTimeout(routingTimeout);
    routingTimeout = null;
  }
});
</script>

<style scoped>
.loading-blur {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.7);
  padding-top: 21vh;
}

input.p-inputtext.p-component.p-password-input {
  width: 100% !important;
}
div#password {
  width: 100% !important;
}
</style>
