import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchDocumentsById } from '@/helpers/query/utils';
import useFamiliesQuery from './useFamiliesQuery';

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

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['families', mockFamilyIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: true,
      }),
    });

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('families', mockFamilyIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockFamilyIds: Ref<string[]> = ref([nanoid()]);
    const queryOptions = { enabled: false };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['families', mockFamilyIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false,
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should keep the query disabled if no family IDs are specified (empty array)', () => {
    const mockFamilyIds: Ref<string[]> = ref([]);
    const queryOptions = { enabled: true };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['families', mockFamilyIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Should be disabled because array is empty
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  // This test seems redundant with the one above and the one below, 
  // but keeping structure similar to original file
  it('should only fetch data if family IDs are available', async () => {
    const mockFamilyIds: Ref<string[]> = ref([]); 
    const queryOptions = { enabled: true };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Initial check (disabled)
    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['families', mockFamilyIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), 
    });
    expect(mockFetchDocumentsById).not.toHaveBeenCalled();

    // Update IDs and check again
    mockFamilyIds.value = [nanoid()];
    await nextTick();

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('families', mockFamilyIds.value);
  });

  it('should not let queryOptions override the internally computed enabled value when IDs are missing', async () => {
    const mockFamilyIds: Ref<string[]> = ref([]);
    const queryOptions = { enabled: true };

    withSetup(() => useFamiliesQuery(mockFamilyIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['families', mockFamilyIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Still false due to empty array
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 