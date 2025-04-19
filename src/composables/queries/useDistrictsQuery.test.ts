import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchDocumentsById } from '@/helpers/query/utils';
import useDistrictsQuery from './useDistrictsQuery'; // Assuming this is the correct composable

// --- Mocks ---
const mockFetchDocumentsById = vi.fn().mockResolvedValue([]);
const mockUseQuery = vi.fn();

vi.mock('@/helpers/query/utils', () => ({
  fetchDocumentsById: mockFetchDocumentsById,
}));

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
interface District {
  id: string;
  name?: string;
  // Add other relevant properties
}

// --- Tests ---
describe('useDistrictsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const districtIds: Ref<string[]> = ref([nanoid()]);

    withSetup(() => useDistrictsQuery(districtIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        enabled: expect.objectContaining({ value: true }),
      })
    );

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('districts', districtIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const districtIds: Ref<string[]> = ref([nanoid()]);
    const queryOptions: UseQueryOptions<District[], Error> = { 
      queryKey: ['districts', districtIds],
      enabled: false 
    };

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if district IDs are available (non-empty array)', async () => {
    const districtIds: Ref<string[]> = ref([]);
    const queryOptions: UseQueryOptions<District[], Error> = { 
      queryKey: ['districts', districtIds],
      enabled: true 
    };

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();

    districtIds.value = [nanoid()];
    await nextTick();

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('districts', districtIds.value);
  });

  it('should not let queryOptions override the internally computed enabled value when IDs are missing (empty array)', async () => {
    const districtIds: Ref<string[]> = ref([]);
    const queryOptions: UseQueryOptions<District[], Error> = { 
      queryKey: ['districts', districtIds],
      enabled: true 
    };

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts', districtIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 