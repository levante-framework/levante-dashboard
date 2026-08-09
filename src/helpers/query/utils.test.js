// TODO: improve test coverage for this file

import axios from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import { fetchDocsById, fetchDocumentsById, fetchSubcollection, retryRequestWithFreshToken } from './utils';

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('axios', () => {
  const post = vi.fn();
  const get = vi.fn();
  const instance = vi.fn();
  instance.post = post;
  instance.get = get;
  instance.interceptors = { response: { use: vi.fn() } };
  return {
    default: {
      create: vi.fn(() => instance),
      __mockPost: post,
      __mockGet: get,
      __mockInstance: instance,
    },
  };
});

describe('Axios helpers offload error logging', () => {
  let mockPost;
  let mockGet;

  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.roarfirekit = {
      roarConfig: { admin: { projectId: 'test-project' } },
      restConfig: {
        admin: { headers: { Authorization: 'Bearer test' } },
      },
    };

    mockPost = axios.__mockPost;
    mockGet = axios.__mockGet;
    mockPost.mockReset();
    mockGet.mockReset();
    vi.mocked(logger.error).mockClear();
  });

  it('fetchDocumentsById throws on Axios failure without logging', async () => {
    const networkError = new Error('batchGet failed');
    mockPost.mockRejectedValueOnce(networkError);

    await expect(fetchDocumentsById('districts', ['district-1'])).rejects.toThrow('batchGet failed');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fetchDocsById throws on Axios failure without logging', async () => {
    const networkError = new Error('get doc failed');
    mockGet.mockRejectedValueOnce(networkError);

    await expect(fetchDocsById([{ collection: 'tasks', docId: 'task-1' }])).rejects.toThrow(
      'Failed to fetch documents by ID',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fetchSubcollection throws on Axios failure without logging or error-object return', async () => {
    const networkError = Object.assign(new Error('subcollection failed'), {
      response: { status: 500 },
    });
    mockGet.mockRejectedValueOnce(networkError);

    await expect(fetchSubcollection('users/user-1', 'surveyResponses')).rejects.toThrow('subcollection failed');
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('retryRequestWithFreshToken', () => {
  let authStore;
  let getIdToken;

  beforeEach(() => {
    setActivePinia(createPinia());
    getIdToken = vi.fn().mockResolvedValue('fresh-token');
    authStore = {
      firebaseUser: { adminFirebaseUser: { getIdToken } },
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(logger.error).mockClear();
  });

  it('forces a token refresh and retries the request once on 401', async () => {
    const axiosInstance = vi.fn().mockResolvedValue({ data: 'ok' });
    const error = { response: { status: 401 }, config: { headers: { Existing: '1' } } };

    const result = await retryRequestWithFreshToken({ error, axiosInstance, authStore, unauthenticated: false });

    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(axiosInstance).toHaveBeenCalledTimes(1);
    expect(axiosInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        _retriedAuth: true,
        headers: { Existing: '1', Authorization: 'Bearer fresh-token' },
      }),
    );
    expect(result).toEqual({ data: 'ok' });
  });

  it('rethrows non-401 errors without refreshing', async () => {
    const axiosInstance = vi.fn();
    const error = { response: { status: 500 }, config: { headers: {} } };

    await expect(retryRequestWithFreshToken({ error, axiosInstance, authStore, unauthenticated: false })).rejects.toBe(
      error,
    );
    expect(getIdToken).not.toHaveBeenCalled();
    expect(axiosInstance).not.toHaveBeenCalled();
  });

  it('does not retry unauthenticated requests', async () => {
    const axiosInstance = vi.fn();
    const error = { response: { status: 401 }, config: { headers: {} } };

    await expect(retryRequestWithFreshToken({ error, axiosInstance, authStore, unauthenticated: true })).rejects.toBe(
      error,
    );
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it('rethrows without retrying when the request was already retried', async () => {
    const axiosInstance = vi.fn();
    const error = { response: { status: 401 }, config: { headers: {}, _retriedAuth: true } };

    await expect(retryRequestWithFreshToken({ error, axiosInstance, authStore, unauthenticated: false })).rejects.toBe(
      error,
    );
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it('tears down the session when the token refresh fails', async () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    getIdToken.mockRejectedValueOnce(new Error('refresh token revoked'));
    const axiosInstance = vi.fn();
    const error = { response: { status: 401 }, config: { headers: {} } };

    await expect(
      retryRequestWithFreshToken({ error, axiosInstance, authStore, unauthenticated: false }),
    ).rejects.toThrow('Session expired');

    expect(authStore.signOut).toHaveBeenCalledOnce();
    expect(assignSpy).toHaveBeenCalledWith('/signin?sessionExpired=true');
    expect(axiosInstance).not.toHaveBeenCalled();

    assignSpy.mockRestore();
  });
});
