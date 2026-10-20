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

// Stub PrimeVue's TabList globally: its mounted() schedules an uncleared setTimeout
// (updateInkBar) that fires after a test's DOM teardown, throwing "HTMLElement is not
// defined". Tests don't assert on the tab strip's rendered DOM, so a stub is safe.
// Spread the existing stubs so VTU's default transition / transition-group stubs (which
// make transitions resolve synchronously in tests) are preserved rather than clobbered.
config.global.stubs = {
  ...config.global.stubs,
  PvTabList: true,
};

// Suppress unhandled promise rejections in tests
// These are often caused by async operations that continue after test completion
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (_reason, _promise) => {
    // Silently ignore unhandled rejections in test environment
    // This prevents CI from failing on non-critical async timing issues
  });
}
