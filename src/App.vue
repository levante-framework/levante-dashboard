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
  <div v-if="isAuthStoreReady" :class="`${authStore.showSideBar ? 'app app--sidebar' : 'app'}`">
    <PvToast position="bottom-center" />

    <NavBar v-if="typeof $route.name === 'string' && !NAVBAR_BLACKLIST.includes($route.name)" />

    <SideBar v-if="authStore.showSideBar" />

    <router-view :key="$route.fullPath" />

    <!-- <SessionTimer v-if="loadSessionTimeoutHandler" /> -->
  </div>
  <div v-else data-testid="app-initializing">
    <LevanteSpinner fullscreen />
  </div>

  <VueQueryDevtools v-if="showDevtools" />
</template>

<script setup>
import { computed, onBeforeMount, onMounted, ref, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import { Head } from '@unhead/vue/components';
import PvToast from 'primevue/toast';
import { useAuthStore } from '@/store/auth';
import { fetchDocById } from '@/helpers/query/utils';
import { i18n } from '@/translations/i18n';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import NavBar from '@/components/NavBar.vue';
import { NAVBAR_BLACKLIST } from './constants';
import SideBar from '@/components/SideBar.vue';
import { usePageEventTracking } from '@/composables/usePageEventTracking';

// const SessionTimer = defineAsyncComponent(() => import('@/containers/SessionTimer/SessionTimer.vue'));
const VueQueryDevtools = defineAsyncComponent(() =>
  import('@tanstack/vue-query-devtools').then((module) => module.VueQueryDevtools),
);

const isAuthStoreReady = ref(false);
const showDevtools = ref(false);

const authStore = useAuthStore();
const route = useRoute();

// Initialize page event tracking for global analytics
usePageEventTracking();

const pageTitle = computed(() => {
  const locale = i18n.global.locale.value;
  const fallbackLocale = i18n.global.fallbackLocale.value;
  const titles = route.meta?.pageTitle;

  if (typeof titles === 'object' && titles !== null) {
    const localeTitle = titles[locale];
    const fallbackTitle = titles[fallbackLocale];
    if (typeof localeTitle === 'string') return localeTitle;
    if (typeof fallbackTitle === 'string') return fallbackTitle;
  }
  if (typeof titles === 'string') {
    return titles;
  }
  return 'Levante';
});

const loadSessionTimeoutHandler = computed(() => isAuthStoreReady.value && authStore.isAuthenticated());

onBeforeMount(async () => {
  try {
    await authStore.initFirekit();

    await authStore.initStateFromRedirect();

    // @TODO: Refactor this bootstrap as we should ideally use the useUserClaimsQuery and useUserDataQuery composables.
    // IMPORTANT: Never block app render on these fetches; participants may not have permission to read all docs.
    const userId = authStore.getUserId();
    if (userId) {
      try {
        const userClaims = await fetchDocById('userClaims', userId);
        authStore.setUserClaims(userClaims);

        const showSideBar = !userClaims?.claims?.super_admin && !userClaims?.claims?.admin;
        authStore.setShowSideBar(showSideBar);
      } catch (error) {
        console.error('App bootstrap: failed to fetch userClaims:', error);
      }
    }

    if (userId) {
      try {
        const userData = await fetchDocById('users', userId);
        authStore.setUserData(userData);
      } catch (error) {
        console.error('App bootstrap: failed to fetch userData:', error);
      }
    }
  } catch (error) {
    console.error('App bootstrap: failed to initialize auth/firekit:', error);
  } finally {
    isAuthStoreReady.value = true;
  }
});

onMounted(() => {
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
