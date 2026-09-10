import type { UpdateUsersInfoParams, UpdateUsersInfoResult } from '@levante-framework/levante-zod';
import * as VueQuery from '@tanstack/vue-query';
import { FirebaseError } from 'firebase/app';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { withSetup } from '@/test-support/withSetup.js';
import useUpdateUsersInfoMutation from './useUpdateUsersInfoMutation';

vi.mock('@/firebase/repositories/UsersRepository', () => ({
  usersRepository: { updateUsersInfo: vi.fn() },
}));

describe('useUpdateUsersInfoMutation', () => {
  let queryClient: VueQuery.QueryClient;

  const mockParams: UpdateUsersInfoParams = {
    users: [{ uid: 'uid-1', archived: true, disabled: false }],
  };

  const mockResult: UpdateUsersInfoResult = {
    users: [{ uid: 'uid-1', archived: true, disabled: false }],
  };

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls usersRepository.updateUsersInfo and returns its result on success', async () => {
    vi.mocked(usersRepository.updateUsersInfo).mockResolvedValue(mockResult);

    const [result] = withSetup(() => useUpdateUsersInfoMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const data = await result.mutateAsync(mockParams);

    expect(usersRepository.updateUsersInfo).toHaveBeenCalledWith(mockParams);
    expect(data).toEqual(mockResult);
    expect(result.isSuccess.value).toBe(true);
  });

  it('invalidates the org users query on success', async () => {
    vi.mocked(usersRepository.updateUsersInfo).mockResolvedValue(mockResult);
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const [result] = withSetup(() => useUpdateUsersInfoMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await result.mutateAsync(mockParams);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: [ORG_USERS_QUERY_KEY], refetchType: 'all' });
  });

  it('wraps a non-Firebase error into a FirebaseFailure with code "error"', async () => {
    const rawError = new Error('boom');
    vi.mocked(usersRepository.updateUsersInfo).mockRejectedValue(rawError);

    const [result] = withSetup(() => useUpdateUsersInfoMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync(mockParams)).rejects.toEqual({
      code: 'error',
      error: rawError,
    });
    expect(result.isError.value).toBe(true);
  });

  it('parses a matching FirebaseError into a FirebaseFailure with code "app-error"', async () => {
    const firebaseError = new FirebaseError('functions/not-found', 'Users not found');
    Object.assign(firebaseError, { details: { code: 'users', uids: ['uid-1'] } });
    vi.mocked(usersRepository.updateUsersInfo).mockRejectedValue(firebaseError);

    const [result] = withSetup(() => useUpdateUsersInfoMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync(mockParams)).rejects.toMatchObject({
      code: 'app-error',
      error: { code: 'functions/not-found', name: 'FirebaseError', details: { code: 'users' } },
    });
  });

  it('falls back to code "firebase-error" for a FirebaseError not in the app schema', async () => {
    const firebaseError = new FirebaseError('auth/network-request-failed', 'Network');
    vi.mocked(usersRepository.updateUsersInfo).mockRejectedValue(firebaseError);

    const [result] = withSetup(() => useUpdateUsersInfoMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync(mockParams)).rejects.toMatchObject({
      code: 'firebase-error',
      error: { code: 'auth/network-request-failed' },
    });
  });
});
