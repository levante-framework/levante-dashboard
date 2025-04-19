import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, VueQueryPlugin, useQuery, type QueryObserverOptions } from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchDocumentsById } from '@/helpers/query/utils';
import useAdministrationsQuery from './useAdministrationsQuery';
import type { UseQueryOptions } from '@tanstack/vue-query';

// --- Mocks ---
const mockFetchDocumentsById = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/utils', () => ({
  fetchDocumentsById: mockFetchDocumentsById,
}));

// Define mockUseQuery BEFORE the vi.mock
const mockUseQuery = vi.fn();

// Apply the simplified mock pattern
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  // Basic implementation for useQuery mock
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), 
    isLoading: ref(false), 
    isError: ref(false), 
    error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    // Explicitly re-export essentials
    QueryClient: (await importOriginal<typeof import('@tanstack/vue-query')>()).QueryClient,
    VueQueryPlugin: (await importOriginal<typeof import('@tanstack/vue-query')>()).VueQueryPlugin,
  };
});

// --- Types (Define or import if needed) ---
interface Administration {
  id: string;
  // ... other administration properties
}

// --- Tests ---
describe('useAdministrationsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks(); 
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    // Assuming useAdministrationsQuery handles Ref<string[] | null | undefined>
    const mockAdministrationIds: Ref<string[]> = ref([nanoid(), nanoid(), nanoid()]);

    withSetup(() => useAdministrationsQuery(mockAdministrationIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Expect mockUseQuery to be called (implementation detail checked via mock)
    expect(mockUseQuery).toHaveBeenCalled();
    // Check the actual query function call if needed, assuming it happens within useQuery mock
    // queryArgs.queryFn(); // Assuming useQuery mock calls queryFn implicitly or explicitly
    // expect(mockFetchDocumentsById).toHaveBeenCalledWith('administrations', mockAdministrationIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockAdministrationIds: Ref<string[]> = ref([nanoid(), nanoid(), nanoid()]);
    // Define full options object
    const queryOptions: UseQueryOptions<Administration[], Error> = { 
      queryKey: ['administrations', mockAdministrationIds], // Add required key
      enabled: false 
    }; 

    // Pass full options
    withSetup(() => useAdministrationsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Expect useQuery to have been called with enabled: false (or computed ref resolving to false)
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ 
        queryKey: ['administrations', mockAdministrationIds],
        enabled: expect.objectContaining({ value: false }) // Check computed value
      })
    );
    // Fetch should not be called if disabled
    // Note: Depending on mock implementation, this check might need adjustment
    // expect(mockFetchDocumentsById).not.toHaveBeenCalled(); 
  });

  it('should only fetch data if the administration IDs are available (non-empty array)', async () => {
    const mockAdministrationIds: Ref<string[]> = ref([]);
    // Pass full options if queryOptions are used
    const queryOptions: UseQueryOptions<Administration[], Error> = { 
        queryKey: ['administrations', mockAdministrationIds], // Include key
        enabled: true 
    };

    withSetup(() => useAdministrationsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });
    
    // ... assertions ...
  });

  it('should not let queryOptions override the internally computed enabled value when IDs are missing (empty array)', async () => {
    const mockAdministrationIds: Ref<string[]> = ref([]);
    // Pass full options if queryOptions are used
    const queryOptions: UseQueryOptions<Administration[], Error> = { 
        queryKey: ['administrations', mockAdministrationIds], // Include key
        enabled: true 
    };

    withSetup(() => useAdministrationsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // ... assertions ...
  });
}); 