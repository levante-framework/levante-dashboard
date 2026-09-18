import { describe, expect, it } from 'vitest';
import { LEVANTE_SENTRY_DSN, LEVANTE_SENTRY_ORG, LEVANTE_SENTRY_PROJECT, LEVANTE_SENTRY_URL } from './sentryConfig';

const FORMER_US_LEVANTE_DSN =
  'https://458fd3b1207c12df79f554b94f22833f@o4507250485035008.ingest.us.sentry.io/4508480347832320';

describe('Sentry EU Cloud', () => {
  it('points Levante ingest at Frankfurt, not US Cloud', () => {
    expect(LEVANTE_SENTRY_DSN).toContain('ingest.de.sentry.io');
    expect(LEVANTE_SENTRY_DSN).toContain('o4512100183048192');
    expect(LEVANTE_SENTRY_DSN).toContain('/4512100188880976');
    expect(LEVANTE_SENTRY_DSN).not.toBe(FORMER_US_LEVANTE_DSN);
    expect(LEVANTE_SENTRY_DSN).not.toContain('ingest.us.sentry.io');
    expect(LEVANTE_SENTRY_ORG).toBe('levante-framework-eu');
    expect(LEVANTE_SENTRY_PROJECT).toBe('dashboard');
    expect(LEVANTE_SENTRY_URL).toBe('https://de.sentry.io');
  });
});
