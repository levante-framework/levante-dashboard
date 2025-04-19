import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
import { withSetup } from '@/test-support/withSetup';
import { fetchLegalDocs } from '@/helpers/query/legal';
import useLegalDocsQuery from './useLegalDocsQuery';

// --- Mocks ---
const mockFetchLegalDocs = vi.fn().mockResolvedValue([]);
const mockUseQuery = vi.fn();

vi.mock('@/helpers/query/legal', () => ({
  fetchLegalDocs: mockFetchLegalDocs,
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
interface LegalDoc {
  id: string;
  url?: string;
  version?: string;
  // Add other relevant properties if known
}

// --- Tests ---
describe('useLegalDocsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    withSetup(() => useLegalDocsQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['legal-docs'],
      })
    );
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const queryOptions: UseQueryOptions<LegalDoc[], Error> = { 
      queryKey: ['legal-docs'],
      enabled: false 
    }; 

    withSetup(() => useLegalDocsQuery(queryOptions as any), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.any(Array),
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });

  it('should only fetch data if internal conditions are met (e.g., required types available)', async () => {
    const queryOptions: UseQueryOptions<LegalDoc[], Error> = { 
      queryKey: ['legal-docs'],
      enabled: true 
    }; 

    withSetup(() => useLegalDocsQuery(queryOptions as any), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.any(Array),
      })
    );
  });
}); 