import { ref, type Ref } from 'vue';
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
import useClassesQuery from './useClassesQuery';

// --- Mocks ---
const mockFetchDocumentsById = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/utils', () => ({
  fetchDocumentsById: mockFetchDocumentsById,
}));

// Declare mockUseQuery BEFORE the vi.mock that uses it
const mockUseQuery = vi.fn();

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), 
    isLoading: ref(false), 
    isError: ref(false), 
    error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    QueryClient: original.QueryClient,
    VueQueryPlugin: original.VueQueryPlugin,
  };
});

// --- Types ---
// Placeholder type for the data returned by the query
interface ClassData { // Renamed from Class to avoid conflict with JS Class keyword
  id: string;
  name?: string;
  // Add other relevant properties if known
}

// --- Tests ---
describe('useClassesQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    // Pass classIds as a Ref
    const classIds: Ref<string[]> = ref([nanoid(), nanoid()]); 

    withSetup(() => useClassesQuery(classIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['classes', classIds],
        enabled: expect.objectContaining({ value: true }), 
      })
    );
    // Pass the value of the ref to the fetch mock check
    expect(mockFetchDocumentsById).toHaveBeenCalledWith('classes', classIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    // Pass classIds as a Ref
    const classIds: Ref<string[]> = ref([nanoid()]);
    // Define full options object
    const queryOptions: UseQueryOptions<ClassData[], Error> = { 
      queryKey: ['classes', classIds], // Add key
      enabled: false 
    }; 

    // Pass full options
    withSetup(() => useClassesQuery(classIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['classes', classIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );
    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should keep the query disabled if no class IDs are specified (empty array)', () => {
    // Pass classIds as a Ref (starting empty)
    const classIds: Ref<string[]> = ref([]); 
    // Define full options object
    const queryOptions: UseQueryOptions<ClassData[], Error> = { 
      queryKey: ['classes', classIds], // Add key
      enabled: true // Attempt to enable
    }; 

    // Pass full options
    withSetup(() => useClassesQuery(classIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['classes', classIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );
    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 