import * as Sentry from '@sentry/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';
import { logger } from '@/logger';
import posthogInstance from '@/plugins/posthog';

describe('logger.userMistake', () => {
  const capturedLogs: Array<{ message?: unknown; attributes?: Record<string, unknown> }> = [];

  beforeEach(() => {
    capturedLogs.length = 0;
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(posthogInstance, 'capture');
    Sentry.init({
      app: createApp({}),
      dsn: 'https://public@o0.ingest.sentry.io/0',
      beforeSendLog(log) {
        capturedLogs.push(log);
        return null;
      },
    });
  });

  it('sends a scrubbed PostHog event and a Sentry log when forced', () => {
    logger.userMistake('invalid_class_code', { page: 'join', email: 'child@example.com', birthYear: 2015 }, true);

    expect(posthogInstance.capture).toHaveBeenCalledWith(
      'User Mistake',
      expect.objectContaining({
        category: 'user_mistake',
        code: 'invalid_class_code',
        page: 'join',
      }),
    );
    const posthogPayload = vi.mocked(posthogInstance.capture).mock.calls[0][1] as Record<string, unknown>;
    expect(posthogPayload).not.toHaveProperty('email');
    expect(posthogPayload).not.toHaveProperty('birthYear');

    expect(capturedLogs).toHaveLength(1);
    expect(capturedLogs[0].message).toBe('invalid_class_code');
    expect(capturedLogs[0].attributes).toEqual(
      expect.objectContaining({
        category: 'user_mistake',
        code: 'invalid_class_code',
        page: 'join',
      }),
    );
    expect(capturedLogs[0].attributes).not.toHaveProperty('email');
    expect(capturedLogs[0].attributes).not.toHaveProperty('birthYear');
  });

  it('stays on the console outside production', () => {
    logger.userMistake('invalid_class_code', { page: 'join' });

    expect(capturedLogs).toHaveLength(0);
    expect(posthogInstance.capture).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      '[Logger User Mistake]',
      'invalid_class_code',
      expect.objectContaining({ code: 'invalid_class_code', page: 'join' }),
    );
  });
});
