import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions, // Import UseQueryOptions
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchDocumentsById } from '@/helpers/query/utils';
import useDistrictsQuery from './useDistrictsQuery'; // Assuming this is the correct composable

// --- Mocks ---
const mockFetchDocumentsById = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/utils', () => ({
  fetchDocumentsById: mockFetchDocumentsById,
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

// --- Types ---
// Placeholder type for the data returned by the query
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

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts', districtIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: true, // Enabled because IDs are present
      }),
    });

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('districts', districtIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const districtIds: Ref<string[]> = ref([nanoid()]);
    // Explicitly type queryOptions
    const queryOptions: Partial<UseQueryOptions<District[], Error>> = { enabled: false };

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts', districtIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Disabled by queryOptions
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if district IDs are available (non-empty array)', async () => {
    const districtIds: Ref<string[]> = ref([]); // Start with empty array
    const queryOptions: Partial<UseQueryOptions<District[], Error>> = { enabled: true };

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts', districtIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Initially disabled because array is empty
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();

    districtIds.value = [nanoid()]; // Provide an ID
    await nextTick(); // Wait for reactivity

    // Expect fetch to be called after IDs are provided
    expect(mockFetchDocumentsById).toHaveBeenCalledWith('districts', districtIds.value);
  });

  it('should not let queryOptions override the internally computed enabled value when IDs are missing (empty array)', async () => {
    const districtIds: Ref<string[]> = ref([]); // Start with empty array
    // User tries to enable, but internal logic should keep it disabled
    const queryOptions: Partial<UseQueryOptions<District[], Error>> = { enabled: true }; 

    withSetup(() => useDistrictsQuery(districtIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts', districtIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Should remain false due to empty IDs array
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 