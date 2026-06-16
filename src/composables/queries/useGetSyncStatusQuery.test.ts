import { ref, type MaybeRefOrGetter } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { type RoarFirekit } from '@levante-framework/firekit';
import { withSetup } from '@/test-support/withSetup.js';
import { useAuthStore } from '@/store/auth';
import { useGetSyncStatusQuery } from './useGetSyncStatusQuery';

const idleStatus = { assignments: { pending: 0 }, users: { pending: 0 } };

describe('useGetSyncStatusQuery', () => {
  let pinia: TestingPinia;
  let queryClient: QueryClient;
  let getSyncStatus: Mock;

  const setFirekit = (firekit: { getSyncStatus: Mock } | null) => {
    const authStore = useAuthStore(pinia);
    authStore.roarfirekit = (firekit ? { ...firekit, initialized: true } : null) as unknown as RoarFirekit;
  };

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
    pinia = createTestingPinia({ stubActions: false });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getSyncStatus = vi.fn().mockResolvedValue(idleStatus);
    setFirekit({ getSyncStatus });
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

  it('does not fetch while roarfirekit is unavailable, then fetches once it is set', async () => {
    setFirekit(null);

    const { data } = mountQuery('site-1');
    await flushPromises();

    expect(getSyncStatus).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();

    setFirekit({ getSyncStatus });
    await flushPromises();

    expect(getSyncStatus).toHaveBeenCalledTimes(1);
    expect(getSyncStatus).toHaveBeenCalledWith({ siteId: 'site-1' });
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

  it('surfaces firekit errors through the query state', async () => {
    const error = new Error('firekit boom');
    getSyncStatus.mockRejectedValueOnce(error);

    const { isError, error: queryError } = mountQuery('site-1');
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(queryError.value).toBe(error);
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
