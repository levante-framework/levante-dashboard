import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { LEGAL_DOCS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchLegalDocs } from '@/helpers/query/legal';

/**
 * Legal docs query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useLegalDocsQuery = (queryOptions?: UseQueryOptions): UseQueryReturnType => {
  return useQuery({
    queryKey: [LEGAL_DOCS_QUERY_KEY],
    queryFn: () => fetchLegalDocs(),
    ...queryOptions,
  });
};

export default useLegalDocsQuery;
