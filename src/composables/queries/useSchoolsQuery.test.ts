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
import { fetchDocumentsById } from '@/helpers/query/utils';
import useSchoolsQuery from './useSchoolsQuery';

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
interface School {
  id: string;
  name?: string;
  // Add other relevant properties if known
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

  it('should call query with correct parameters when school IDs are provided', () => {
    const mockSchoolIds: Ref<string[]> = ref([nanoid(), nanoid()]);

    withSetup(() => useSchoolsQuery(mockSchoolIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['schools', mockSchoolIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: true }), // Enabled because IDs are present
    });

    expect(mockFetchDocumentsById).toHaveBeenCalledWith('schools', mockSchoolIds.value);
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockSchoolIds: Ref<string[]> = ref([nanoid()]);
    const queryOptions = { enabled: false }; // Untyped

    withSetup(() => useSchoolsQuery(mockSchoolIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['schools', mockSchoolIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Disabled by queryOptions
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });

  it('should only fetch data once the school IDs are available (non-empty array)', async () => {
    const mockSchoolIds: Ref<string[]> = ref([]); // Start empty
    const queryOptions = { enabled: true }; // Untyped

    withSetup(() => useSchoolsQuery(mockSchoolIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['schools', mockSchoolIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Initially disabled
    });
    expect(mockFetchDocumentsById).not.toHaveBeenCalled();

    // Set IDs
    mockSchoolIds.value = [nanoid(), nanoid()];
    await nextTick();

    // Expect fetch to be called now
    expect(mockFetchDocumentsById).toHaveBeenCalledWith('schools', mockSchoolIds.value);
  });

  it('should not let queryOptions override the internally computed value when IDs are missing', async () => {
    const mockSchoolIds: Ref<string[]> = ref([]); // Start empty
    const queryOptions = { enabled: true }; // Untyped

    withSetup(() => useSchoolsQuery(mockSchoolIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['schools', mockSchoolIds],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Stays false
    });

    expect(mockFetchDocumentsById).not.toHaveBeenCalled();
  });
}); 