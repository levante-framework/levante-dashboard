import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { FIRESTORE_DATABASES } from '@/constants/firebase';
import { useAuthStore } from '@/store/auth';
import { getAxiosInstance, isAuthError } from './utils';

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}));

const withStatus = (status: number, config?: InternalAxiosRequestConfig) => {
  const error = new AxiosError(`Request failed with status code ${status}`);
  error.response = {
    status,
    statusText: 'Error',
    data: {},
    headers: {},
    config: config ?? ({} as InternalAxiosRequestConfig),
  };
  error.config = config;
  return error;
};

describe('isAuthError', () => {
  it.each([401, 403])('is true for HTTP %i', (status) => {
    expect(isAuthError(withStatus(status))).toBe(true);
  });

  it('is false for non-auth failures', () => {
    expect(isAuthError(withStatus(500))).toBe(false);
    expect(isAuthError(new Error('network'))).toBe(false);
  });
});

describe('getAxiosInstance auth session handling', () => {
  const getIdToken = vi.fn();

  beforeEach(() => {
    getIdToken.mockReset();
    getIdToken.mockResolvedValue('fresh-token');

    vi.mocked(useAuthStore).mockReturnValue({
      roarfirekit: ref({
        restConfig: {
          [FIRESTORE_DATABASES.ADMIN]: {
            headers: {
              Authorization: 'Bearer stale-token',
            },
          },
        },
        admin: {
          auth: {
            currentUser: {
              getIdToken,
            },
          },
        },
      }),
    } as never);
  });

  it('replaces the stale restConfig bearer token with a live ID token per request', async () => {
    const instance = getAxiosInstance();
    let seenAuthorization: string | undefined;

    instance.defaults.adapter = async (config) => {
      seenAuthorization = config.headers?.Authorization as string | undefined;
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    await instance.get('/projects/mock/databases/(default)/documents');

    expect(getIdToken).toHaveBeenCalledWith();
    expect(seenAuthorization).toBe('Bearer fresh-token');
  });

  it('retries once after a forced token refresh when the first response is 401', async () => {
    // Mirrors the Firebase SDK: once getIdToken(true) succeeds, later
    // getIdToken() calls return the refreshed credential.
    let hasForcedRefresh = false;
    getIdToken.mockImplementation(async (forceRefresh?: boolean) => {
      if (forceRefresh) hasForcedRefresh = true;
      return hasForcedRefresh ? 'forced-fresh-token' : 'fresh-token';
    });

    const instance = getAxiosInstance();
    const authorizations: string[] = [];
    let attempts = 0;

    instance.defaults.adapter = async (config) => {
      attempts += 1;
      authorizations.push(String(config.headers?.Authorization));

      if (attempts === 1) {
        throw withStatus(401, config);
      }

      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const response = await instance.get('/projects/mock/databases/(default)/documents');

    expect(attempts).toBe(2);
    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(authorizations).toEqual(['Bearer fresh-token', 'Bearer forced-fresh-token']);
    expect(response.data).toEqual({ ok: true });
  });

  it('propagates the 401 when a forced refresh cannot recover the session', async () => {
    getIdToken.mockImplementation(async (forceRefresh?: boolean) => {
      if (forceRefresh) throw new Error('auth/user-token-expired');
      return 'fresh-token';
    });

    const instance = getAxiosInstance();
    instance.defaults.adapter = async (config) => {
      throw withStatus(401, config);
    };

    await expect(instance.get('/projects/mock/databases/(default)/documents')).rejects.toThrow(
      'auth/user-token-expired',
    );
  });
});
