import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { withSetup } from '@/test-support/withSetup.js';
import useSchoolsQuery from './useSchoolsQuery';

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

describe('useSchoolsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters when fetching a specific school', () => {
    const mockSchoolIds = ref([nanoid(), nanoid()]);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useSchoolsQuery(mockSchoolIds), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', mockSchoolIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: true,
        }),
      }),
    );

    expect(fetchDocumentsById).toHaveBeenCalledWith('schools', mockSchoolIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockSchoolIds = ref([nanoid()]);
    const queryOptions = { enabled: false } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useSchoolsQuery(mockSchoolIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', mockSchoolIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data once the school IDs are available', async () => {
    const mockSchoolIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useSchoolsQuery(mockSchoolIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', mockSchoolIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();

    mockSchoolIds.value = [nanoid(), nanoid()];
    await nextTick();

    expect(fetchDocumentsById).toHaveBeenCalledWith('schools', mockSchoolIds.value);
  });

  it('should not let queryOptions override the internally computed value', async () => {
    const mockSchoolIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useSchoolsQuery(mockSchoolIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', mockSchoolIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });
});
