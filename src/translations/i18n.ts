import { LEVANTE_TRANSLATIONS } from '@/constants/bucket';
import { isLevante } from '@/helpers';
import { createI18n } from 'vue-i18n';

interface LanguageOption {
  language: string;
  isRTL?: boolean;
  testing?: boolean;
}

// Merge utility to deeply combine message trees
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key] as Record<string, any>, value as Record<string, any>);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export const languageOptions: Record<string, LanguageOption> = {
  // Frozen as first option
  'en-US': {
    language: 'English (United States)',
  },
  // Alphabetically sorted
  'de-DE': {
    language: 'Deutsch (Deutschland)',
  },
  'es-CO': {
    language: 'Español (Colombia)',
  },
  // Testing languages
  'ar-IL': {
    // Arabic (Israel)
    language: 'العربية',
    isRTL: true,
    testing: true,
  },
  'es-AR': {
    language: 'Español (Argentina)',
    testing: true,
  },
  'he-IL': {
    // Hebrew (Israel)
    language: 'עברית',
    isRTL: true,
    testing: true,
  },
};

const browserLocale = window.navigator.language;

const getLocale = (localeFromBrowser: string) => {
  const storageKey = `${isLevante ? 'levante' : 'roar'}PlatformLocale`;
  const localeFromStorage = sessionStorage.getItem(storageKey);
  if (localeFromStorage) return localeFromStorage;

  sessionStorage.setItem(storageKey, localeFromBrowser);
  return localeFromBrowser;
};

export const formattedLocale = getLocale(browserLocale);

/**
 * Finds the best matching locale from available languageOptions.
 *
 * - If exact match exists, returns it
 * - If no exact match, finds first available locale with matching language prefix
 * - Falls back to 'en-US' if no match found
 *
 * @param locale - The locale to match (e.g., 'en-US', 'en-GB', 'de', 'de-CH')
 * @returns The best matching locale from languageOptions, or 'en-US' as fallback
 */
export function findBestMatchingLocale(locale: string | undefined | null): string {
  if (!locale) return 'en-US';

  // Get available locales from languageOptions keys
  const availableLocales = Object.keys(languageOptions);

  // Normalize the input locale to lowercase for comparison
  const normalizedLocale = locale.toLowerCase();

  // First, check for exact match (case-insensitive)
  const exactMatch = availableLocales.find((available) => available.toLowerCase() === normalizedLocale);
  if (exactMatch) return exactMatch;

  // Extract the language prefix (e.g., 'en' from 'en-GB', 'de' from 'de-CH' or just 'de')
  const languagePrefix = normalizedLocale.split('-')[0];

  // Find the first available locale that starts with the same language prefix
  const prefixMatch = availableLocales.find((available) => available.toLowerCase().startsWith(languagePrefix + '-'));
  if (prefixMatch) return prefixMatch;

  // If no match found, default to en-US
  return 'en-US';
}

const getFallbackLocale = () => {
  const storageKey = `${isLevante ? 'levante' : 'roar'}PlatformLocale`;
  const localeFromStorage = sessionStorage.getItem(storageKey);
  const localeToUse = localeFromStorage || browserLocale;
  return findBestMatchingLocale(localeToUse);
};

const baseMessages: Record<string, any> = {};

export const i18n = createI18n({
  locale: getLocale(browserLocale),
  fallbackLocale: getFallbackLocale(),
  messages: baseMessages,
  legacy: false,
  globalInjection: true,
});

interface Translations {
  [key: string]: string | Translations;
}

const remoteCache = new Map<string, Translations>();

async function fetchTranslations(bucket: 'test' | 'live', locale: string): Promise<Translations | null> {
  const parsedLocale = findBestMatchingLocale(locale);
  const cacheKey = `${bucket}_${parsedLocale}`;
  const cached = remoteCache.get(cacheKey);
  if (cached) return cached;

  const url = `${LEVANTE_TRANSLATIONS}/${bucket}/${parsedLocale}/dashboard_translations.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    if (!data || typeof data !== 'object') return null;

    remoteCache.set(cacheKey, data as Translations);
    return data as Translations;
  } catch (error) {
    console.error(`Failed to fetch ${bucket.toLowerCase()} translations`, error);
    return null;
  }
}

export async function getTranslations(locale?: string): Promise<boolean> {
  const currentLocale = locale || i18n.global.locale.value;

  const isDev = import.meta.env.VITE_FIREBASE_PROJECT === 'DEV';

  const [liveTranslations, testTranslations] = await Promise.all([
    fetchTranslations('live', currentLocale),
    isDev ? fetchTranslations('test', currentLocale) : Promise.resolve(null),
  ]);

  const liveAndTestTranslations = deepMerge(liveTranslations ?? {}, testTranslations ?? {});

  const bundled = baseMessages[currentLocale];

  const merged = deepMerge(bundled ? { ...bundled } : {}, liveAndTestTranslations);

  i18n.global.setLocaleMessage(currentLocale, merged);
  baseMessages[currentLocale] = merged;

  // Setting html dir (LTR/RTL) based on locale
  const isRTL = (languageOptions[currentLocale]?.isRTL as boolean) ?? false;
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

  return true;
}

// Export for debugging
export { baseMessages };
