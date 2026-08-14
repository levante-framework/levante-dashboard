import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { withSetup } from '@/test-support/withSetup.js';
import useClassesQuery from './useClassesQuery';

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

describe('useClassesQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const classIds = ref([nanoid(), nanoid()]);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useClassesQuery(classIds), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['classes', classIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: true,
        }),
      }),
    );

    expect(fetchDocumentsById).toHaveBeenCalledWith('classes', classIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const classIds = ref([nanoid()]);
    const queryOptions = { enabled: false } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useClassesQuery(classIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['classes', classIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should keep the query disabled if not class IDs are specified', () => {
    const classIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useClassesQuery(classIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['classes', classIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });
});
