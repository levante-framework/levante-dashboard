<template>
  <Head>
    <title>{{ pageTitle }}</title>
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
  <div>
    <PvToast />
    <NavBar v-if="!navbarBlacklist.includes($route.name) && authStore.isReady" />
    <router-view :key="$route.fullPath" />

    <SessionTimer v-if="loadSessionTimeoutHandler" />
  </div>

  <VueQueryDevtools v-if="showDevtools" />
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, ref, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import { useRecaptchaProvider } from 'vue-recaptcha';
import { Head } from '@unhead/vue/components';
import PvToast from 'primevue/toast';
import NavBar from '@/components/NavBar.vue';

const SessionTimer = defineAsyncComponent(() => import('@/containers/SessionTimer/SessionTimer.vue'));
const VueQueryDevtools = defineAsyncComponent(() =>
  import('@tanstack/vue-query-devtools').then((module) => module.VueQueryDevtools),
);

import { useAuthStore } from '@/store/auth.js';
import { fetchDocById } from '@/helpers/query/utils';
import { i18n } from '@/translations/i18n';

const showDevtools = ref(false);

const authStore = useAuthStore();
const route = useRoute();

const pageTitle = computed(() => {
  const locale = i18n.global.locale.value;
  const fallbackLocale = i18n.global.fallbackLocale.value;
  return route.meta?.pageTitle?.[locale] || route.meta?.pageTitle?.[fallbackLocale] || route.meta?.pageTitle;
});

const loadSessionTimeoutHandler = computed(() => authStore.isReady && authStore.isAuthenticated);

useRecaptchaProvider();

const navbarBlacklist = ref([
  'SignIn',
  'Register',
  'Maintenance',
  'PlayApp',
  'SWR',
  'SWR-ES',
  'SRE',
  'SRE-ES',
  'PA',
  'PA-ES',
  'Letter',
  'Letter-ES',
  'Vocab',
  'Multichoice',
  'Morphology',
  'Cva',
  'Fluency-ARF',
  'Fluency-ARF-ES',
  'Fluency-CALF',
  'Fluency-CALF-ES',
  'Fluency-Alpaca',
  'Fluency-Alpaca-ES',
  'RAN',
  'Crowding',
  'MEP',
]);

onBeforeMount(async () => {
  // Keep initStateFromRedirect here 
  await authStore.initStateFromRedirect();
});

onMounted(async () => {
  console.log('[App.vue] onMounted - Starting');
  try {
    console.log('[App.vue] onMounted - Calling initFirekit...');
    await authStore.initFirekit(); // This action now sets authStore.isReady
    console.log('[App.vue] onMounted - initFirekit FINISHED. Store readiness:', authStore.isReady);
    
    // Fetch user data ONLY after successful init
    // Check store readiness before fetching
    if (authStore.isReady) {
        console.log('[App.vue] onMounted - Fetching user claims/data after successful init...');
        if (authStore.uid) {
          console.log('[App.vue] onMounted - Fetching userClaims for uid:', authStore.uid);
          const userClaims = await fetchDocById('userClaims', authStore.uid);
          authStore.userClaims = userClaims;
          console.log('[App.vue] onMounted - Fetched userClaims:', userClaims);
        }
        if (authStore.roarUid) {
           console.log('[App.vue] onMounted - Fetching userData for roarUid:', authStore.roarUid);
          const userData = await fetchDocById('users', authStore.roarUid);
          authStore.userData = userData;
           console.log('[App.vue] onMounted - Fetched userData:', userData);
        }
    } else {
        console.warn('[App.vue] onMounted - Store not ready after initFirekit, skipping initial data fetch.');
    }
    
  } catch (error) {
     console.error("Failed to initialize Firekit or fetch initial data in onMounted:", error);
     // Store already sets isReady to false on error
     // isAuthStoreReady.value = false; 
     // console.log('[App.vue] onMounted - isAuthStoreReady set to false due to error.');
  }

  const isLocal = import.meta.env.MODE === 'development';
  const isDevToolsEnabled = import.meta.env.VITE_QUERY_DEVTOOLS_ENABLED === 'true';

  if (isLocal) {
    showDevtools.value = true;
  } else if (isDevToolsEnabled) {
    window.toggleDevtools = () => {
      showDevtools.value = !showDevtools.value;
    };
  }
});
</script>
