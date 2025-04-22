import { ref, type Ref } from 'vue';
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
import { fetchDocumentsById } from '@/helpers/query/utils';
import useClassesQuery from './useClassesQuery';

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

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['classes', classIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: true }), 
    });
    // Pass the value of the ref to the fetch mock check
    expect(mockFetchDocumentsById).toHaveBeenCalledWith('classes', classIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    // Pass classIds as a Ref
    const classIds: Ref<string[]> = ref([nanoid()]);
    const queryOptions = { enabled: false };

    withSetup(() => useClassesQuery(classIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['classes', classIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }),
    });
    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should keep the query disabled if no class IDs are specified (empty array)', () => {
    // Pass classIds as a Ref (starting empty)
    const classIds: Ref<string[]> = ref([]); 
    const queryOptions = { enabled: true };

    withSetup(() => useClassesQuery(classIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['classes', classIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }),
    });
    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 