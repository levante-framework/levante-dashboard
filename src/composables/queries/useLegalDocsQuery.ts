import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { fetchLegalDocs, LegalDocument } from '@/helpers/query/legal.ts';
import { LEGAL_DOCS_QUERY_KEY } from '@/constants/queryKeys';
import { MaybeRef } from 'vue';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

/**
 * Legal docs query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<LegalDocument[], Error>} The TanStack query result using the imported type.
 */
const useLegalDocsQuery = (
  queryOptions: QueryOptions = {}
): UseQueryReturnType<LegalDocument[], Error> => {

  // queryKey is static in this case
  const queryKey: QueryKey = [LEGAL_DOCS_QUERY_KEY];

  // queryFn calls fetchLegalDocs
  const queryFn = async (): Promise<LegalDocument[]> => {
    const data = await fetchLegalDocs();
    // Ensure data is an array before casting
    return Array.isArray(data) ? data : [];
  };

  return useQuery<LegalDocument[], Error>({
    queryKey,
    queryFn,
    ...(queryOptions ?? {}),
  });
};

export default useLegalDocsQuery; 