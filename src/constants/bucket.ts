/** Live assets bucket for this dashboard build. Dev reads dev; every other build reads prod. */
export const LEVANTE_ASSETS_BUCKET =
  import.meta.env.VITE_FIREBASE_PROJECT === 'DEV' ? 'levante-assets-dev' : 'levante-assets-prod';

// For surveys and audio files (new bucket structure)
export const LEVANTE_BUCKET_URL = `https://storage.googleapis.com/${LEVANTE_ASSETS_BUCKET}`;

// For dashboard UI static images (PNG files) hosted in the assets bucket.
// Path convention: `gs://levante-assets-*/visual/dashboard/...`
export const LEVANTE_STATIC_ASSETS_URL = `${LEVANTE_BUCKET_URL}/visual/dashboard`;

export const LEVANTE_SURVEY_RESPONSES_KEY = 'levante-survey-responses';

/** GCS JSON API: list objects in the active assets bucket (use `?prefix=` to scope). */
export const LEVANTE_BUCKET_STORAGE_LIST_API = `https://storage.googleapis.com/storage/v1/b/${LEVANTE_ASSETS_BUCKET}/o`;

export const LEVANTE_TRANSLATIONS = `${LEVANTE_BUCKET_URL}/translations/dashboard-consolidated-flat`;

export const LEVANTE_TRANSLATION_LANGUAGES = `${LEVANTE_TRANSLATIONS}/languageoptions.json`;
