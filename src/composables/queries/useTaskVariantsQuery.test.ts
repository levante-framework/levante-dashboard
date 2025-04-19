import { ref, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  // Keep UseQueryOptions commented out
  // type UseQueryOptions,
} from '@tanstack/vue-query';
import { variantsFetcher } from '@/helpers/query/tasks';
import useTaskVariantsQuery from './useTaskVariantsQuery';

// --- Mocks ---
const mockVariantsFetcher = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/tasks', () => ({
  variantsFetcher: mockVariantsFetcher,
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
interface TaskVariant {
  id: string;
  name?: string;
  // Add other relevant properties if known
}

// --- Tests ---
describe('useTaskVariantsQuery', () => { // Corrected describe block name
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with default key when not fetching registered only', () => {
    const fetchRegisteredVariants: Ref<boolean> = ref(false);
    withSetup(() => useTaskVariantsQuery(fetchRegisteredVariants), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];
    expect(queryArgs.queryKey).toHaveLength(1);
    expect(queryArgs.queryKey[0]).toEqual('task-variants');

    expect(mockVariantsFetcher).toHaveBeenCalledWith(fetchRegisteredVariants.value);
  });

  it("should set the 'registered' query key segment if fetching registered variants only", () => {
    const fetchRegisteredVariants: Ref<boolean> = ref(true);
    withSetup(() => useTaskVariantsQuery(fetchRegisteredVariants), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];
    expect(queryArgs.queryKey).toHaveLength(2);
    expect(queryArgs.queryKey[0]).toEqual('task-variants');
    expect(queryArgs.queryKey[1]).toEqual('registered');

    expect(mockVariantsFetcher).toHaveBeenCalledWith(fetchRegisteredVariants.value);
  });
}); 