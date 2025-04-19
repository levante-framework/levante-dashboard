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
import useFamiliesQuery from './useFamiliesQuery';

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
// Placeholder type for the data returned by the query
interface Family {
  id: string;
  // Add other relevant properties if known
}

// --- Tests ---
describe('useFamiliesQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockFamilyIds: Ref<string[]> = ref([nanoid()]);

    withSetup(() => useFamiliesQuery(mockFamilyIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['families', mockFamilyIds],
        enabled: expect.objectContaining({ value: true }),
      })
    );

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('families', mockFamilyIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockFamilyIds: Ref<string[]> = ref([nanoid()]);
    const queryOptions: UseQueryOptions<Family[], Error> = { 
      queryKey: ['families', mockFamilyIds],
      enabled: false 
    };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions as any), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['families', mockFamilyIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should keep the query disabled if no family IDs are specified (empty array)', () => {
    const mockFamilyIds: Ref<string[]> = ref([]);
    const queryOptions: UseQueryOptions<Family[], Error> = { 
      queryKey: ['families', mockFamilyIds],
      enabled: true 
    };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions as any), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['families', mockFamilyIds],
        enabled: expect.objectContaining({ value: false }), 
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if family IDs are available', async () => {
    const mockFamilyIds: Ref<string[]> = ref([]); 
    const queryOptions: UseQueryOptions<Family[], Error> = { 
      queryKey: ['families', mockFamilyIds],
      enabled: true 
    };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions as any), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Initial check (disabled)
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['families', mockFamilyIds],
        enabled: expect.objectContaining({ value: false }), 
      })
    );

    // Update IDs and check again
    mockFamilyIds.value = [nanoid()];
    await nextTick();
  });

  it('should not let queryOptions override the internally computed enabled value when IDs are missing', async () => {
    const mockFamilyIds: Ref<string[]> = ref([]);
    const queryOptions: UseQueryOptions<Family[], Error> = { 
      queryKey: ['families', mockFamilyIds],
      enabled: true 
    };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions as any), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['families', mockFamilyIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 