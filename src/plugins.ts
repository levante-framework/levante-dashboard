import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
// @ts-ignore - Linter struggles with resolving .js file via alias here, but build works
import router from '@/router/index';
import TextClamp from 'vue3-text-clamp';
import { createHead } from '@unhead/vue';
import { MutationCache, Query, QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { surveyPlugin } from 'survey-vue3-ui';
// @ts-ignore - Linter struggles with resolving .ts file via alias here, but build works
import { i18n } from '@/translations/i18n';
import { createPinia } from 'pinia';
import piniaPluginPersistedState from 'pinia-plugin-persistedstate';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import { logger } from '@/logger';

const pinia = createPinia().use(piniaPluginPersistedState);
const head = createHead();

// Define the custom PrimeVue theme preset
const MyPreset = definePreset(Aura, {
  primitive: {
    red: { 500: '#DA3D16', 700: '#A22D10', 400: '#A22D10', 600: '#A22D10' },
    surface: { 100: '#adb5bd', 500: '#DA3D16' },
  },
  semantic: {
    primary: {
      50: '{surface.200}',
      100: '{surface.300}',
      200: '{red.200}',
      300: '{red.300}',
      400: '{red.400}',
      500: '{red.500}',
      600: '{red.600}',
      700: '{red.700}',
      800: '{red.800}',
      900: '{red.900}',
      950: '{red.950}',
    },
  },
});

// ──── Configure VueQueryPlugin ────
function handleQueryError(error: unknown, meta?: Record<string, unknown>) {
  // Log explicit firekit errors to Sentry
  if (!!error && typeof error === 'object' && 'code' in error && 'data' in error) {
    logger.error(error, meta);
    // TODO signOut on functions/unauthenticated?
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleQueryError(error, query.meta);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      handleQueryError(error, mutation.meta);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: (window as any).Cypress ? 0 : 10 * 60 * 1000,
      gcTime: (window as any).Cypress ? 0 : 15 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const plugins = [
  [
    PrimeVue,
    {
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: 'dark-mode',
        },
      },
      ripple: true,
    },
  ],
  [VueQueryPlugin, { queryClient }],
  ConfirmationService,
  ToastService,
  router,
  TextClamp,
  head,
  surveyPlugin,
  i18n,
  pinia,
];

export default plugins;
