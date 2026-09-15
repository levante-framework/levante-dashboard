import type { CreateUsersParams, CreateUsersResult } from '@levante-framework/levante-zod';
import * as VueQuery from '@tanstack/vue-query';
import { FirebaseError } from 'firebase/app';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { withSetup } from '@/test-support/withSetup.js';
import useCreateUsersMutation from './useCreateUsersMutation';

vi.mock('@/firebase/repositories/UsersRepository', () => ({
  usersRepository: { createUsers: vi.fn() },
}));

describe('useCreateUsersMutation', () => {
  let queryClient: VueQuery.QueryClient;

  const mockParams: CreateUsersParams = {
    siteId: 'site-1',
    users: [
      {
        userType: 'child',
        id: 'ext-1',
        orgIds: { schools: ['s-1'], classes: ['c-1'], cohorts: [] },
        month: 5,
        year: 2018,
      },
    ],
  };

  const mockResult: CreateUsersResult = {
    users: [{ id: 'ext-1', email: 'a@b.com', password: 'pw', uid: 'uid-1' }],
  };

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls usersRepository.createUsers and returns its result on success', async () => {
    vi.mocked(usersRepository.createUsers).mockResolvedValue(mockResult);

    const [result] = withSetup(() => useCreateUsersMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const data = await result.mutateAsync(mockParams);

    expect(usersRepository.createUsers).toHaveBeenCalledWith(mockParams);
    expect(data).toEqual(mockResult);
    expect(result.isSuccess.value).toBe(true);
  });

  it('invalidates the org users query on success', async () => {
    vi.mocked(usersRepository.createUsers).mockResolvedValue(mockResult);
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const [result] = withSetup(() => useCreateUsersMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await result.mutateAsync(mockParams);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: [ORG_USERS_QUERY_KEY], refetchType: 'all' });
  });

  it('wraps a non-Firebase error into a FirebaseFailure with code "error"', async () => {
    const rawError = new Error('boom');
    vi.mocked(usersRepository.createUsers).mockRejectedValue(rawError);

    const [result] = withSetup(() => useCreateUsersMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync(mockParams)).rejects.toEqual({ code: 'error', error: rawError });
    expect(result.isError.value).toBe(true);
  });

  it('parses a matching FirebaseError into a FirebaseFailure with code "app-error"', async () => {
    const firebaseError = new FirebaseError('functions/already-exists', 'Users already exist');
    Object.assign(firebaseError, {
      details: { code: 'users', users: [{ id: 'ext-1', email: 'a@b.com', uid: 'uid-1' }] },
    });
    vi.mocked(usersRepository.createUsers).mockRejectedValue(firebaseError);

    const [result] = withSetup(() => useCreateUsersMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync(mockParams)).rejects.toMatchObject({
      code: 'app-error',
      error: { code: 'functions/already-exists', name: 'FirebaseError', details: { code: 'users' } },
    });
  });

  it('falls back to code "firebase-error" for a FirebaseError not in the app schema', async () => {
    const firebaseError = new FirebaseError('auth/network-request-failed', 'Network');
    vi.mocked(usersRepository.createUsers).mockRejectedValue(firebaseError);

    const [result] = withSetup(() => useCreateUsersMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync(mockParams)).rejects.toMatchObject({
      code: 'firebase-error',
      error: { code: 'auth/network-request-failed' },
    });
  });
});
