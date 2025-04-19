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
import useSchoolsQuery from './useSchoolsQuery';

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
interface SchoolData { 
  id: string;
  name?: string;
}

// --- Tests ---
describe('useSchoolsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const schoolIds: Ref<string[]> = ref([nanoid(), nanoid()]); 

    withSetup(() => useSchoolsQuery(schoolIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', schoolIds],
        enabled: expect.objectContaining({ value: true }), 
      })
    );

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('schools', schoolIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const schoolIds: Ref<string[]> = ref([nanoid()]);
    const queryOptions: UseQueryOptions<SchoolData[], Error> = { 
      queryKey: ['schools', schoolIds],
      enabled: false 
    }; 

    withSetup(() => useSchoolsQuery(schoolIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', schoolIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should keep the query disabled if no school IDs are specified (empty array)', () => {
    const schoolIds: Ref<string[]> = ref([]); 
    const queryOptions: UseQueryOptions<SchoolData[], Error> = { 
      queryKey: ['schools', schoolIds],
      enabled: true 
    }; 

    withSetup(() => useSchoolsQuery(schoolIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['schools', schoolIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 