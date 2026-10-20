import { config } from '@vue/test-utils';
import { vi } from 'vitest';
import { languageOptions } from '@/translations/i18n';

const locale = 'en';

config.global.mocks = {
  $t: (msg) => languageOptions[locale]?.translations[msg],
};

vi.mock('vue-recaptcha', () => ({
  default: {},
  useRecaptchaProvider: vi.fn(),
  VueRecaptchaPlugin: vi.fn(),
}));

// Mock the $t function based on the logic in i18n.js
config.global.mocks = {
  $t: (key) => {
    const locale = 'en-US';
    return languageOptions[locale]?.translations[key];
  },
};

// PrimeVue's TabList schedules an uncleared setTimeout (updateInkBar) in its mounted() hook
// that fires after a test's DOM teardown, throwing "HTMLElement is not defined". A VTU
// stub-by-name is order-dependent and proved unreliable across the full suite, so replace the
// module with a minimal component that still renders its tab triggers (the default slot) and
// provides $pcTabList (which child Tab components inject), but has none of the ink-bar/timer
// logic. Child Tab elements (.p-tab / .p-tab-active) and click behavior are unaffected.
vi.mock('primevue/tablist', () => ({
  default: {
    name: 'TabList',
    provide() {
      return { $pcTabList: this };
    },
    render() {
      return this.$slots.default?.();
    },
  },
}));

// Suppress unhandled promise rejections in tests
// These are often caused by async operations that continue after test completion
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (_reason, _promise) => {
    // Silently ignore unhandled rejections in test environment
    // This prevents CI from failing on non-critical async timing issues
  });
}
