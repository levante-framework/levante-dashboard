import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { withSetup } from '@/test-support/withSetup.js';
import useDistrictsQuery from './useDistrictsQuery';

vi.mock('@/helpers/query/utils', () => ({
  fetchDocumentsById: vi.fn().mockImplementation(() => []),
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = (await getModule()) as typeof import('@tanstack/vue-query');
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useDistrictsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
    vi.mocked(fetchDocumentsById).mockReset();
    vi.mocked(fetchDocumentsById).mockImplementation(() => Promise.resolve([]));
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const districtIds = ref([nanoid()]);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useDistrictsQuery(districtIds), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: true,
        }),
      }),
    );

    expect(fetchDocumentsById).toHaveBeenCalledWith('districts', districtIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const districtIds = ref([nanoid()]);
    const queryOptions = { enabled: false } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if the district IDs are available', async () => {
    const districtIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();

    districtIds.value = [nanoid()];
    await nextTick();

    expect(fetchDocumentsById).toHaveBeenCalledWith('districts', districtIds.value);
  });

  it('should not let queryOptions override the internally computed value', async () => {
    const districtIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });

  it('propagates the error when fetchDocumentsById fails', async () => {
    const districtIds = ref([nanoid()]);
    const networkError = new Error('batchGet failed');
    vi.mocked(fetchDocumentsById).mockRejectedValueOnce(networkError);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useDistrictsQuery(districtIds, { enabled: false } as QueryOptionsWithEnabled), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const lastCallArgs = vi.mocked(VueQuery.useQuery).mock.calls.at(-1)?.[0] as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(lastCallArgs.queryFn()).rejects.toThrow(networkError);
  });
});
