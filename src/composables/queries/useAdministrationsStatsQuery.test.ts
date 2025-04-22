import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  // Keep UseQueryOptions commented out
  // type UseQueryOptions,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchDocsById } from '@/helpers/query/utils'; // Corrected import name
import useAdministrationsStatsQuery from './useAdministrationsStatsQuery';

// --- Mocks ---
const mockFetchDocsById = vi.fn().mockResolvedValue([]); // Mock fetchDocsById
vi.mock('@/helpers/query/utils', () => ({
  fetchDocsById: mockFetchDocsById,
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(original.useQuery);
  return {
    ...original,
    useQuery: mockUseQuery,
  };
});

// --- Helper Function ---
// Define type for the payload if specific structure is expected by fetchDocsById
interface CollectionRequestPayload {
    collection: string;
    docId: string;
}

// Add type annotation for the helper function
function buildCollectionRequestPayload(id: string): CollectionRequestPayload {
  return {
    collection: 'administrations',
    docId: `${id}/stats/total`,
  };
}

// --- Types ---
// Placeholder type for the data returned by the query
interface AdminStats {
  id: string; // Assuming the result includes an ID or identifier
  total?: number;
  // Add other relevant properties if known
}

// --- Tests ---
describe('useAdministrationsStatsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockAdministrationIds: Ref<string[]> = ref([nanoid(), nanoid(), nanoid()]);

    withSetup(() => useAdministrationsStatsQuery(mockAdministrationIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations-stats', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: true }), // Enabled because IDs are present
    });

    // Assuming queryFn calls fetchDocsById
    const expectedPayload: CollectionRequestPayload[] = mockAdministrationIds.value.map((id) => 
        buildCollectionRequestPayload(id)
    );
    expect(mockFetchDocsById).toHaveBeenCalledWith(expectedPayload);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockAdministrationIds: Ref<string[]> = ref([nanoid(), nanoid(), nanoid()]);
    const queryOptions = { enabled: false }; // Untyped

    withSetup(() => useAdministrationsStatsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations-stats', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Disabled by queryOptions
    });

    expect(mockFetchDocsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if administration IDs are available (non-empty array)', async () => {
    // Use empty array instead of null
    const mockAdministrationIds: Ref<string[]> = ref([]); 
    const queryOptions = { enabled: true }; // Untyped

    withSetup(() => useAdministrationsStatsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations-stats', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Initially disabled (empty array)
    });
    expect(mockFetchDocsById).not.toHaveBeenCalled();

    // Set IDs
    mockAdministrationIds.value = [nanoid(), nanoid()];
    await nextTick();

    // Expect fetch to be called now
    const expectedPayload: CollectionRequestPayload[] = mockAdministrationIds.value.map((id) => 
        buildCollectionRequestPayload(id)
    );
    expect(mockFetchDocsById).toHaveBeenCalledWith(expectedPayload);
  });

  it('should not let queryOptions override the internally computed value when IDs are missing', async () => {
    // Use empty array instead of null
    const mockAdministrationIds: Ref<string[]> = ref([]); 
    const queryOptions = { enabled: true }; // Untyped

    withSetup(() => useAdministrationsStatsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations-stats', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Stays false
    });

    expect(mockFetchDocsById).not.toHaveBeenCalled();
  });
}); 