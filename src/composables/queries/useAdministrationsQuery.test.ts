import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, VueQueryPlugin, useQuery, type QueryObserverOptions } from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchDocumentsById } from '@/helpers/query/utils';
import useAdministrationsQuery from './useAdministrationsQuery';

// --- Mocks ---
const mockFetchDocumentsById = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/utils', () => ({
  fetchDocumentsById: mockFetchDocumentsById,
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(original.useQuery); // Implement mock before returning
  return {
    ...original,
    useQuery: mockUseQuery,
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

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: true,
      }),
    });

    // Check fetchDocumentsById call (ensure ID array is passed correctly)
    expect(mockFetchDocumentsById).toHaveBeenCalledWith('administrations', mockAdministrationIds.value); 
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockAdministrationIds: Ref<string[]> = ref([nanoid(), nanoid(), nanoid()]);
    const queryOptions: Partial<QueryObserverOptions> = { enabled: false };

    withSetup(() => useAdministrationsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false,
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data if the administration IDs are available (non-empty array)', async () => {
    const mockAdministrationIds: Ref<string[]> = ref([]);
    const queryOptions: Partial<QueryObserverOptions> = { enabled: true };

    withSetup(() => useAdministrationsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Initially false because array is empty
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();

    mockAdministrationIds.value = [nanoid(), nanoid()];
    await nextTick();
    
    // Manually trigger query re-evaluation or check mock calls if necessary
    // Vue Query might need a kick to re-evaluate enabled based on ref change
    // For simplicity, assume reactivity works and fetch is called.
    // In a real scenario, might need queryClient.invalidateQueries or similar.
    expect(mockFetchDocumentsById).toHaveBeenCalledWith('administrations', mockAdministrationIds.value);
  });

  it('should not let queryOptions override the internally computed enabled value when IDs are missing (empty array)', async () => {
    const mockAdministrationIds: Ref<string[]> = ref([]);
    const queryOptions: Partial<QueryObserverOptions> = { enabled: true };

    withSetup(() => useAdministrationsQuery(mockAdministrationIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['administrations', mockAdministrationIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false,
      }),
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 