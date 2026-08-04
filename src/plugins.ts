import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import { MutationCache, QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createHead } from '@unhead/vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedState from 'pinia-plugin-persistedstate';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { surveyPlugin } from 'survey-vue3-ui';
import TextClamp from 'vue3-text-clamp';
import { logger } from '@/logger';
import router from '@/router/index';
import { i18n } from '@/translations/i18n';

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
  // Opt-out for callers that log the error themselves (e.g. a mutation's own onError
  // with per-call context) so we don't double-report to Sentry.
  if (meta?.skipGlobalErrorLogging) return;

  // Log explicit firekit errors to Sentry
  const isFirekitError = error && typeof error === 'object' && 'code' in error && 'data' in error;
  if (isFirekitError) {
    logger.error(new Error('Firekit query error', { cause: error }), {
      tags: { function: 'handleQueryError', code: String(error.code) },
      ...meta,
    });
    return;
  }

  // Log other query errors to Sentry
  const errorMessage = typeof meta?.errorMessage === 'string' ? meta.errorMessage : 'Unknown query error';
  const errorContext =
    meta?.errorContext && typeof meta.errorContext === 'object' ? { ...meta.errorContext } : undefined;
  logger.error(new Error(errorMessage, { cause: error }), errorContext);
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
      staleTime: 'Cypress' in window ? 0 : 10 * 60 * 1000,
      gcTime: 'Cypress' in window ? 0 : 15 * 60 * 1000,
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
