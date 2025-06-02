<template>
  <Head>
    <title>Levante - {{ pageTitle }}</title>
    <meta name="description" content="The LEVANTE Platform" />

    <!-- Social -->
    <meta property="og:title" content="LEVANTE" />
    <meta property="og:description" content="The LEVANTE Platform" />

    <!-- Twitter -->
    <meta name="twitter:title" content="LEVANTE" />
    <meta name="twitter:description" content="The LEVANTE Platform" />

    <!-- Dynamic Favicon -->
    <link rel="icon" :href="`/favicon-levante.ico`" />
  </Head>
  
  <!-- Temporary Clear Session Button - appears on loading screen -->
  <div v-if="!isAuthStoreReady" style="position: fixed; top: 10px; right: 10px; z-index: 9999;">
    <button 
      @click="clearSession" 
      style="background: red; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;"
    >
      Clear Session & Reload
    </button>
  </div>
  
  <div v-if="isAuthStoreReady">
    <PvToast position="bottom-center" />
    <NavBar
      v-if="
        typeof $route.name === 'string' &&
        !navbarBlacklist.includes($route.name)
      "
    />
    <router-view :key="$route.fullPath" />

    <SessionTimer v-if="loadSessionTimeoutHandler" />
  </div>
  <div v-else>
    <LevanteSpinner fullscreen />
  </div>

  <VueQueryDevtools v-if="showDevtools" />
</template>

<script setup>
console.log('App.vue: Script setup executing...');

import {
  computed,
  onBeforeMount,
  onMounted,
  ref,
  defineAsyncComponent,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { Head } from "@unhead/vue/components";
import PvToast from "primevue/toast";
import NavBar from "@/components/NavBar.vue";
import { useAuthStore } from "@/store/auth";
import { fetchDocById } from "@/helpers/query/utils";
import { i18n } from "@/translations/i18n";
import LevanteSpinner from "@/components/LevanteSpinner.vue";

console.log('App.vue: Imports complete, setting up component...');

const SessionTimer = defineAsyncComponent(() =>
  import("@/containers/SessionTimer/SessionTimer.vue"),
);
const VueQueryDevtools = defineAsyncComponent(() =>
  import("@tanstack/vue-query-devtools").then(
    (module) => module.VueQueryDevtools,
  ),
);

const isAuthStoreReady = ref(false);
const showDevtools = ref(false);

const authStore = useAuthStore();
const route = useRoute();

console.log('App.vue: Basic setup complete, authStore initialized');

// Immediate initialization - run as soon as the component is created
console.log('App.vue: Component created, checking if immediate initialization is needed...');

// Add a fallback timeout in case onMounted doesn't fire
const fallbackTimeout = setTimeout(() => {
  console.warn('App.vue: onMounted did not fire within 3 seconds, setting ready state as fallback');
  isAuthStoreReady.value = true;
}, 3000);

// Check if firekit is already initialized and user is authenticated
if (authStore.isFirekitInit && authStore.isAuthenticated) {
  console.log('App.vue: Firekit already initialized and user authenticated');
  
  // Always check if we need to fetch userClaims/userData, don't skip initialization
  if (!authStore.userClaims || !authStore.userData) {
    console.log('App.vue: User authenticated but userClaims/userData missing, will fetch in onMounted');
  } else {
    console.log('App.vue: User authenticated and userClaims/userData available, setting ready state immediately');
    clearTimeout(fallbackTimeout);
    isAuthStoreReady.value = true;
  }
} else if (!authStore.isFirekitInit) {
  console.log('App.vue: Firekit not initialized, will initialize in onMounted');
} else {
  console.log('App.vue: Firekit initialized but user not authenticated');
}

// Function to fetch user data when needed
const fetchUserDataIfNeeded = async () => {
  if (!authStore.isAuthenticated || !authStore.isFirekitInit) {
    console.log('App.vue: User not authenticated or firekit not ready, skipping user data fetch');
    return;
  }

  console.log('App.vue: Fetching user data if needed...', {
    uid: authStore.uid,
    roarUid: authStore.roarUid,
    hasUserClaims: !!authStore.userClaims,
    hasUserData: !!authStore.userData
  });

  // Wait for the firekit to have proper REST configuration
  let restReadyAttempts = 0;
  while (restReadyAttempts < 20) {
    try {
      const restConfig = authStore.roarfirekit?.restConfig;
      if (restConfig && (restConfig.admin || restConfig.app || restConfig.merged)) {
        console.log('App.vue: REST API is ready');
        break;
      }
    } catch (error) {
      console.log('App.vue: REST config not ready yet, attempt:', restReadyAttempts + 1);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    restReadyAttempts++;
  }
  
  if (restReadyAttempts >= 20) {
    console.warn('App.vue: REST API readiness timeout, proceeding anyway');
  }
  
  // Always fetch userClaims if user is authenticated and we don't have them
  if (authStore.uid && !authStore.userClaims) {
    console.log('App.vue: Fetching userClaims for uid:', authStore.uid);
    try {
      const userClaims = await fetchDocById("userClaims", authStore.uid);
      authStore.setUserClaims(userClaims);
      console.log('App.vue: UserClaims fetched successfully:', userClaims);
    } catch (error) {
      console.warn('App.vue: Failed to fetch userClaims:', error);
      console.warn('App.vue: This might be normal if the user is new or if emulators are not seeded');
      // Don't fail the initialization if userClaims fetch fails
    }
  } else if (authStore.userClaims) {
    console.log('App.vue: UserClaims already available, skipping fetch');
  } else {
    console.log('App.vue: No uid available, skipping userClaims fetch');
  }
  
  // Always fetch userData if user is authenticated and we don't have it
  if (authStore.roarUid && !authStore.userData) {
    console.log('App.vue: Fetching userData for roarUid:', authStore.roarUid);
    try {
      const userData = await fetchDocById("users", authStore.roarUid);
      authStore.setUserData(userData);
      console.log('App.vue: UserData fetched successfully:', userData);
    } catch (error) {
      console.warn('App.vue: Failed to fetch userData:', error);
      console.warn('App.vue: This might be normal if the user is new or if emulators are not seeded');
      // Don't fail the initialization if userData fetch fails
    }
  } else if (authStore.userData) {
    console.log('App.vue: UserData already available, skipping fetch');
  } else {
    console.log('App.vue: No roarUid available, skipping userData fetch');
  }
};

// Watch for authentication state changes and fetch user data when user signs in
watch(
  () => authStore.isAuthenticated,
  async (newValue, oldValue) => {
    console.log('App.vue: Authentication state changed:', { oldValue, newValue });
    
    if (newValue && !oldValue && authStore.isFirekitInit) {
      console.log('App.vue: User just signed in, fetching user data...');
      await fetchUserDataIfNeeded();
      console.log('App.vue: User data fetch complete after sign in, setting ready state');
      isAuthStoreReady.value = true;
    } else if (!newValue && oldValue) {
      console.log('App.vue: User signed out, clearing user data');
      // User data will be cleared by the auth store
    }
  },
  { immediate: false }
);

const pageTitle = computed(() => {
  const locale = i18n.global.locale.value;
  const fallbackLocale = i18n.global.fallbackLocale.value;
  const titles = route.meta?.pageTitle;

  if (typeof titles === "object" && titles !== null) {
    const localeTitle = titles[locale];
    const fallbackTitle = titles[fallbackLocale];
    if (typeof localeTitle === "string") return localeTitle;
    if (typeof fallbackTitle === "string") return fallbackTitle;
  }
  if (typeof titles === "string") {
    return titles;
  }
  return "Levante";
});

const loadSessionTimeoutHandler = computed(
  () => isAuthStoreReady.value && authStore.isAuthenticated,
);

const navbarBlacklist = ref([
  "SignIn",
  "Register",
  "Maintenance",
  "PlayApp",
  "SWR",
  "SRE",
  "PA",
]);

onMounted(async () => {
  console.log('App.vue: Component mounted, starting initialization...');
  
  // Clear the fallback timeout since onMounted fired
  clearTimeout(fallbackTimeout);
  
  // If already ready, don't reinitialize
  if (isAuthStoreReady.value) {
    console.log('App.vue: Already ready, skipping initialization');
    return;
  }
  
  // Add timeout protection for the entire initialization process
  const initializationTimeout = setTimeout(() => {
    console.warn('App.vue: Initialization timed out, setting ready state');
    isAuthStoreReady.value = true;
  }, 15000); // 15 second timeout
  
  try {
    // Only initialize firekit if it's not already initialized
    if (!authStore.isFirekitInit) {
      console.log('App.vue: Initializing firekit...');
      await authStore.initFirekit();
      console.log('App.vue: Firekit initialization complete');
    } else {
      console.log('App.vue: Firekit already initialized, skipping initialization');
    }

    console.log('App.vue: Checking redirect state...');
    const redirectResult = await authStore.initStateFromRedirect();
    console.log('App.vue: Redirect state check complete, result:', redirectResult);
    
    console.log('App.vue: Starting user data fetch process...');
    console.log('App.vue: Auth store state:', {
      uid: authStore.uid,
      roarUid: authStore.roarUid,
      isAuthenticated: authStore.isAuthenticated,
      isFirekitInit: authStore.isFirekitInit,
      hasUserClaims: !!authStore.userClaims,
      hasUserData: !!authStore.userData
    });
    
    // Fetch user data if user is authenticated
    await fetchUserDataIfNeeded();
    
    console.log('App.vue: User data fetching complete');

    console.log('App.vue: Initialization complete, setting ready state');
    clearTimeout(initializationTimeout);
    isAuthStoreReady.value = true;
  } catch (error) {
    console.error('App.vue: Error during initialization:', error);
    // Set ready state even if there's an error to prevent infinite loading
    clearTimeout(initializationTimeout);
    isAuthStoreReady.value = true;
  }

  // Original onMounted logic for dev tools
  const isLocal = import.meta.env.MODE === "development";
  const isDevToolsEnabled =
    import.meta.env.VITE_QUERY_DEVTOOLS_ENABLED === "true";

  if (isLocal) {
    showDevtools.value = true;
  } else if (isDevToolsEnabled) {
    window.toggleDevtools = () => {
      showDevtools.value = !showDevtools.value;
    };
  }
});

const clearSession = () => {
  console.log('App.vue: Clearing session manually...');
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear auth store state
  authStore.userData = null;
  authStore.userClaims = null;
  authStore.firebaseUser.adminFirebaseUser = null;
  authStore.firebaseUser.appFirebaseUser = null;
  
  // Sign out from Firebase if possible
  if (authStore.roarfirekit) {
    try {
      authStore.roarfirekit.signOut();
    } catch (error) {
      console.warn('Error signing out:', error);
    }
  }
  
  // Reload the page to ensure clean state
  window.location.reload();
};
</script>
