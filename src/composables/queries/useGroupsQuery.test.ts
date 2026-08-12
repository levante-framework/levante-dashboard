import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { withSetup } from '@/test-support/withSetup.js';
import useGroupsQuery from './useGroupsQuery';

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

describe('useGroupsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockGroupIds = ref([nanoid(), nanoid()]);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useGroupsQuery(mockGroupIds), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['groups', mockGroupIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: true,
        }),
      }),
    );

    expect(fetchDocumentsById).toHaveBeenCalledWith('groups', mockGroupIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockGroupIds = ref([nanoid(), nanoid()]);
    const queryOptions = { enabled: false } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useGroupsQuery(mockGroupIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['groups', mockGroupIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if the group IDs are available', async () => {
    const mockGroupIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useGroupsQuery(mockGroupIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['groups', mockGroupIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();

    mockGroupIds.value = [nanoid()];
    await nextTick();

    expect(fetchDocumentsById).toHaveBeenCalledWith('groups', mockGroupIds.value);
  });

  it('should not let queryOptions override the internally computed value', async () => {
    const mockGroupIds = ref<string[]>([]);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useGroupsQuery(mockGroupIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['groups', mockGroupIds],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
        }),
      }),
    );

    expect(fetchDocumentsById).not.toHaveBeenCalled();
  });
});
