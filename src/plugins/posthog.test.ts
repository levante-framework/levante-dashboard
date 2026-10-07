import { describe, expect, it } from 'vitest';
import { POSTHOG_API_HOST, POSTHOG_PROJECT_KEY } from './posthog';

const EU_INGEST_HOST = 'https://eu.i.posthog.com';
const US_INGEST_HOST = 'https://us.i.posthog.com';
const FORMER_US_PROJECT_KEY = 'phc_td8viDO0LP7PZsn7nZrV9bJBYgEMSHE9WeVTlW2CGh5';

describe('PostHog EU Cloud', () => {
  it('points the client at the Frankfurt project, not US Cloud', () => {
    expect(POSTHOG_API_HOST).toBe(EU_INGEST_HOST);
    expect(POSTHOG_PROJECT_KEY).toMatch(/^phc_/);
    expect(POSTHOG_PROJECT_KEY).not.toBe(FORMER_US_PROJECT_KEY);
    expect(POSTHOG_API_HOST).not.toBe(US_INGEST_HOST);
  });
});
