import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { QueryClient, VueQueryPlugin, useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { variantsFetcher, type VariantWithTask } from '@/helpers/query/tasks';
import useTaskVariantsQuery from './useTaskVariantsQuery';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';

// --- Mocks ---
const mockVariantsFetcher = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/tasks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/helpers/query/tasks')>();
  return {
      ...original,
      variantsFetcher: mockVariantsFetcher,
  };
});

const mockFetchDocsWhere = vi.fn().mockResolvedValue([]);
const mockFetchDocById = vi.fn().mockResolvedValue(null);

vi.mock('@/helpers/query/utils', () => ({
  fetchDocsWhere: mockFetchDocsWhere,
  fetchDocById: mockFetchDocById,
}));

const mockUseQuery = vi.fn();

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), 
    isLoading: ref(false), 
    isError: ref(false), 
    error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    QueryClient: (await importOriginal<typeof import('@tanstack/vue-query')>()).QueryClient,
    VueQueryPlugin: (await importOriginal<typeof import('@tanstack/vue-query')>()).VueQueryPlugin,
  };
});

// --- Types ---

// --- Tests ---
describe('useTaskVariantsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    mockUseQuery.mockImplementation(() => ({ 
        data: ref([]), isLoading: ref(false), isError: ref(false), error: ref(null) 
    }));
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with default key when registeredOnly is false (default)', () => {
    withSetup(() => useTaskVariantsQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [TASK_VARIANTS_QUERY_KEY],
      })
    );
  });

  it('should call query with registered key when registeredOnly is true', () => {
    const registeredOnly = ref(true);
    withSetup(() => useTaskVariantsQuery(registeredOnly), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [TASK_VARIANTS_QUERY_KEY, 'registered'],
      })
    );
  });

  it('should allow the query to be disabled via queryOptions (registeredOnly=false)', () => {
    const registeredOnly = ref(false);
    const queryOptions: any = { 
      enabled: false 
    };

    withSetup(() => useTaskVariantsQuery(registeredOnly, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [TASK_VARIANTS_QUERY_KEY],
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });

  it('should allow the query to be disabled via queryOptions (registeredOnly=true)', () => {
    const registeredOnly = ref(true);
    const queryOptions: any = { 
      enabled: false 
    };

    withSetup(() => useTaskVariantsQuery(registeredOnly, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [TASK_VARIANTS_QUERY_KEY, 'registered'],
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });
}); 