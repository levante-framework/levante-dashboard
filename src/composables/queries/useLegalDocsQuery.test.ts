import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  // Keep UseQueryOptions commented out
  // type UseQueryOptions,
} from '@tanstack/vue-query';
import { withSetup } from '@/test-support/withSetup';
import { fetchLegalDocs } from '@/helpers/query/legal';
import useLegalDocsQuery from './useLegalDocsQuery';

// --- Mocks ---
const mockFetchLegalDocs = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/legal', () => ({
  fetchLegalDocs: mockFetchLegalDocs,
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

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['legal-docs'],
      queryFn: expect.any(Function),
      // Add enabled expectation if the default is true
      // enabled: true 
    });

    // Assuming queryFn calls fetchLegalDocs
    // We might need to extract the queryFn and call it to test this
    // For now, checking if the mock was called assumes enabled:true
    expect(mockFetchLegalDocs).toHaveBeenCalledWith();
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const queryOptions = { enabled: false };

    withSetup(() => useLegalDocsQuery(queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['legal-docs'],
      queryFn: expect.any(Function),
      enabled: false, // Check direct boolean value
    });

    expect(mockFetchLegalDocs).not.toHaveBeenCalled();
  });
}); 