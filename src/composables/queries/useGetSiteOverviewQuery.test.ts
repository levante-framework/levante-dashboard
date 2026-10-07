import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type MaybeRefOrGetter, ref } from 'vue';
import { groupsRepository } from '@/firebase/repositories/GroupsRepository';
import { withSetup } from '@/test-support/withSetup.js';
import { useGetSiteOverviewQuery } from './useGetSiteOverviewQuery';

vi.mock('@/firebase/repositories/GroupsRepository', () => ({
  groupsRepository: {
    getSiteOverview: vi.fn(),
  },
}));

const getSiteOverview = groupsRepository.getSiteOverview as unknown as Mock;

describe('useGetSiteOverviewQuery', () => {
  let queryClient: QueryClient;

  const mountQuery = (
    siteId: Parameters<typeof useGetSiteOverviewQuery>[0],
    enabled?: MaybeRefOrGetter<boolean>,
  ): ReturnType<typeof useGetSiteOverviewQuery> => {
    const [result] = withSetup(() => useGetSiteOverviewQuery(siteId, enabled), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getSiteOverview.mockResolvedValue({ siteName: 'default' });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetches the site overview for the given siteId and exposes the result', async () => {
    const payload = { siteName: 'Acme School' };
    getSiteOverview.mockResolvedValueOnce(payload);

    const { data, isSuccess } = mountQuery('site-1');
    await flushPromises();

    expect(getSiteOverview).toHaveBeenCalledTimes(1);
    expect(getSiteOverview).toHaveBeenCalledWith({ siteId: 'site-1' });
    expect(isSuccess.value).toBe(true);
    expect(data.value).toEqual(payload);
  });

  it('refetches when siteId changes and serves the new payload (not stale cache)', async () => {
    const siteId = ref('site-1');
    getSiteOverview.mockResolvedValueOnce({ siteName: 'one' }).mockResolvedValueOnce({ siteName: 'two' });

    const { data } = mountQuery(siteId);
    await flushPromises();
    expect(data.value).toEqual({ siteName: 'one' });

    siteId.value = 'site-2';
    await flushPromises();

    expect(getSiteOverview).toHaveBeenCalledTimes(2);
    expect(getSiteOverview).toHaveBeenLastCalledWith({ siteId: 'site-2' });
    expect(data.value).toEqual({ siteName: 'two' });
  });

  it('waits for siteId to be populated before fetching', async () => {
    const siteId = ref('');
    const { data } = mountQuery(siteId);
    await flushPromises();

    expect(getSiteOverview).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();

    siteId.value = 'site-late';
    await flushPromises();

    expect(getSiteOverview).toHaveBeenCalledTimes(1);
    expect(getSiteOverview).toHaveBeenCalledWith({ siteId: 'site-late' });
  });

  it('respects a reactive `enabled` argument', async () => {
    const enabled = ref(false);
    const { data } = mountQuery('site-1', enabled);
    await flushPromises();

    expect(getSiteOverview).not.toHaveBeenCalled();

    enabled.value = true;
    await flushPromises();

    expect(getSiteOverview).toHaveBeenCalledTimes(1);
    expect(data.value).toEqual({ siteName: 'default' });
  });

  it('does not let `enabled: true` override the internal preconditions', async () => {
    const { data } = mountQuery('', true);
    await flushPromises();

    expect(getSiteOverview).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();
  });

  it('surfaces a rejected repository call as a FirebaseFailure', async () => {
    const error = new Error('overview boom');
    getSiteOverview.mockRejectedValueOnce(error);

    const { isError, error: queryError } = mountQuery('site-1');
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(queryError.value).toEqual({ code: 'error', error });
  });
});
