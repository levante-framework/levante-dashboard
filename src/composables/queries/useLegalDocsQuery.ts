import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { fetchLegalDocs } from '@/helpers/query/legal';
import { LEGAL_DOCS_QUERY_KEY } from '@/constants/queryKeys';

// Placeholder type for legal document data
interface LegalDocData {
  id: string; // Or the actual identifier property
  name?: string;
  content?: string; // Or however the content is structured
  // Add other expected properties
  [key: string]: any;
}

// Define the specific query options type
type LegalDocsQueryOptions = Omit<
  UseQueryOptions<LegalDocData[], Error, LegalDocData[], ReadonlyArray<string>>,
  'queryKey' | 'queryFn'
>;

/**
 * Legal docs query.
 *
 * @param {LegalDocsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<LegalDocData[], Error>} The TanStack query result.
 */
const useLegalDocsQuery = (
  queryOptions: LegalDocsQueryOptions = {},
): UseQueryReturnType<LegalDocData[], Error> => {
  return useQuery<LegalDocData[], Error, LegalDocData[], ReadonlyArray<string>>({
    queryKey: [LEGAL_DOCS_QUERY_KEY],
    queryFn: async (): Promise<LegalDocData[]> => {
      // Ensure fetchLegalDocs returns the expected type or cast
      const result = await fetchLegalDocs();
      return result as LegalDocData[];
    },
    ...queryOptions, // Spread the provided options
  });
};

export default useLegalDocsQuery;
