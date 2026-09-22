import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type MaybeRefOrGetter, ref } from 'vue';
import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { withSetup } from '@/test-support/withSetup.js';
import { useGetUserOverviewQuery } from './useGetUserOverviewQuery';

vi.mock('@/firebase/repositories/UsersRepository', () => ({
  usersRepository: {
    getUserOverview: vi.fn(),
  },
}));

const getUserOverview = usersRepository.getUserOverview as unknown as Mock;

describe('useGetUserOverviewQuery', () => {
  let queryClient: QueryClient;

  const mountQuery = (
    uid: Parameters<typeof useGetUserOverviewQuery>[0],
    enabled?: MaybeRefOrGetter<boolean>,
  ): ReturnType<typeof useGetUserOverviewQuery> => {
    const [result] = withSetup(() => useGetUserOverviewQuery(uid, enabled), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getUserOverview.mockResolvedValue({ uid: 'default' });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetches the user overview for the given uid and exposes the result', async () => {
    const overview = { uid: 'user-1', email: 'a@b.co' };
    getUserOverview.mockResolvedValueOnce(overview);

    const { data, isSuccess } = mountQuery('user-1');
    await flushPromises();

    expect(getUserOverview).toHaveBeenCalledTimes(1);
    expect(getUserOverview).toHaveBeenCalledWith({ uid: 'user-1' });
    expect(isSuccess.value).toBe(true);
    expect(data.value).toEqual(overview);
  });

  it('refetches when uid changes and serves the new payload (not stale cache)', async () => {
    const uid = ref('user-1');
    getUserOverview.mockResolvedValueOnce({ uid: 'one' }).mockResolvedValueOnce({ uid: 'two' });

    const { data } = mountQuery(uid);
    await flushPromises();
    expect(data.value).toEqual({ uid: 'one' });

    uid.value = 'user-2';
    await flushPromises();

    expect(getUserOverview).toHaveBeenCalledTimes(2);
    expect(getUserOverview).toHaveBeenLastCalledWith({ uid: 'user-2' });
    expect(data.value).toEqual({ uid: 'two' });
  });

  it('uses a query key scoped to the uid', async () => {
    const uid = nanoid();
    mountQuery(uid);
    await flushPromises();

    expect(queryClient.getQueryData(['user-overview', uid])).toEqual({ uid: 'default' });
  });

  it('waits for uid to be populated before fetching', async () => {
    const uid = ref('');
    const { data } = mountQuery(uid);
    await flushPromises();

    expect(getUserOverview).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();

    uid.value = 'user-late';
    await flushPromises();

    expect(getUserOverview).toHaveBeenCalledTimes(1);
    expect(getUserOverview).toHaveBeenCalledWith({ uid: 'user-late' });
  });

  it('respects a reactive `enabled` argument', async () => {
    const enabled = ref(false);
    const { data } = mountQuery('user-1', enabled);
    await flushPromises();

    expect(getUserOverview).not.toHaveBeenCalled();

    enabled.value = true;
    await flushPromises();

    expect(getUserOverview).toHaveBeenCalledTimes(1);
    expect(data.value).toEqual({ uid: 'default' });
  });

  it('does not let `enabled: true` override the empty-uid precondition', async () => {
    const { data } = mountQuery('', true);
    await flushPromises();

    expect(getUserOverview).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();
  });

  it('normalizes a rejected repository call into a FirebaseFailure and exposes no data', async () => {
    const boom = new Error('repository boom');
    getUserOverview.mockRejectedValueOnce(boom);

    const { isError, error, data } = mountQuery('user-1');
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(error.value).toEqual({ code: 'error', error: boom });
    expect(data.value).toBeUndefined();
  });
});
