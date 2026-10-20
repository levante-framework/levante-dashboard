export const LEVANTE_SENTRY_DSN =
  'https://977fb8ee9133661b62187e4d72502233@o4512100183048192.ingest.de.sentry.io/4512100188880976';
export const LEVANTE_QA_SENTRY_DSN =
  'https://980b2a6c43596d7d64999058210ce9c8@o4512100183048192.ingest.de.sentry.io/4512285094117456';
export const LEVANTE_SENTRY_PROJECT_FLAG = 'levante-sentry-project';
export const LEVANTE_SENTRY_ORG = 'levante-framework-eu';
export const LEVANTE_SENTRY_PROJECT = 'dashboard';
export const LEVANTE_SENTRY_URL = 'https://de.sentry.io';

export function resolveLevanteSentryDsn(flagValue: string | null | undefined): string {
  return flagValue === 'qa' ? LEVANTE_QA_SENTRY_DSN : LEVANTE_SENTRY_DSN;
}
