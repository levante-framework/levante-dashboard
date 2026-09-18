import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type MaybeRefOrGetter, ref } from 'vue';
import { groupsRepository } from '@/firebase/repositories/GroupsRepository';
import { withSetup } from '@/test-support/withSetup.js';
import { useGetSyncStatusQuery } from './useGetSyncStatusQuery';

vi.mock('@/firebase/repositories/GroupsRepository', () => ({
  groupsRepository: {
    getSyncStatus: vi.fn(),
  },
}));

const getSyncStatus = groupsRepository.getSyncStatus as unknown as Mock;

const idleStatus = { assignments: { pending: 0 }, users: { pending: 0 } };

describe('useGetSyncStatusQuery', () => {
  let queryClient: QueryClient;

  const mountQuery = (
    siteId: Parameters<typeof useGetSyncStatusQuery>[0],
    enabled?: MaybeRefOrGetter<boolean>,
  ): ReturnType<typeof useGetSyncStatusQuery> => {
    const [result] = withSetup(() => useGetSyncStatusQuery(siteId, enabled), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getSyncStatus.mockResolvedValue(idleStatus);
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetches the sync status for the given siteId and exposes the result', async () => {
    const payload = { assignments: { pending: 3 }, users: { pending: 1 } };
    getSyncStatus.mockResolvedValueOnce(payload);

    const { data, isSuccess } = mountQuery('site-1');
    await flushPromises();

    expect(getSyncStatus).toHaveBeenCalledTimes(1);
    expect(getSyncStatus).toHaveBeenCalledWith({ siteId: 'site-1' });
    expect(isSuccess.value).toBe(true);
    expect(data.value).toEqual(payload);
  });

  it('refetches when siteId changes and serves the new payload (not stale cache)', async () => {
    const siteId = ref('site-1');
    getSyncStatus
      .mockResolvedValueOnce({ assignments: { pending: 0 }, users: { pending: 0 } })
      .mockResolvedValueOnce({ assignments: { pending: 0 }, users: { pending: 0 }, label: 'two' });

    const { data } = mountQuery(siteId);
    await flushPromises();
    expect(data.value).toEqual({ assignments: { pending: 0 }, users: { pending: 0 } });

    siteId.value = 'site-2';
    await flushPromises();

    expect(getSyncStatus).toHaveBeenCalledTimes(2);
    expect(getSyncStatus).toHaveBeenLastCalledWith({ siteId: 'site-2' });
    expect(data.value).toEqual({ assignments: { pending: 0 }, users: { pending: 0 }, label: 'two' });
  });

  it('waits for siteId to be populated before fetching', async () => {
    const siteId = ref('');
    const { data } = mountQuery(siteId);
    await flushPromises();

    expect(getSyncStatus).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();

    siteId.value = 'site-late';
    await flushPromises();

    expect(getSyncStatus).toHaveBeenCalledTimes(1);
    expect(getSyncStatus).toHaveBeenCalledWith({ siteId: 'site-late' });
  });

  it('respects a reactive `enabled` argument', async () => {
    const enabled = ref(false);
    const { data } = mountQuery('site-1', enabled);
    await flushPromises();

    expect(getSyncStatus).not.toHaveBeenCalled();

    enabled.value = true;
    await flushPromises();

    expect(getSyncStatus).toHaveBeenCalledTimes(1);
    expect(data.value).toEqual(idleStatus);
  });

  it('does not let `enabled: true` override the internal preconditions', async () => {
    const { data } = mountQuery('', true);
    await flushPromises();

    expect(getSyncStatus).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();
  });

  it('surfaces a rejected repository call as a FirebaseFailure', async () => {
    const error = new Error('sync boom');
    getSyncStatus.mockRejectedValueOnce(error);

    const { isError, error: queryError } = mountQuery('site-1');
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(queryError.value).toEqual({ code: 'error', error });
  });

  it('polls while a sync is pending and stops once everything is settled', async () => {
    vi.useFakeTimers();
    try {
      getSyncStatus
        .mockResolvedValueOnce({ assignments: { pending: 2 }, users: { pending: 0 } })
        .mockResolvedValue(idleStatus);

      const { data } = mountQuery('site-1');
      await flushPromises();
      expect(getSyncStatus).toHaveBeenCalledTimes(1);
      expect(data.value).toEqual({ assignments: { pending: 2 }, users: { pending: 0 } });

      await vi.advanceTimersByTimeAsync(5000);
      await flushPromises();
      expect(getSyncStatus).toHaveBeenCalledTimes(2);
      expect(data.value).toEqual(idleStatus);

      await vi.advanceTimersByTimeAsync(15000);
      await flushPromises();
      expect(getSyncStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
