import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import { fetchLegalDocs } from '@/helpers/query/legal';
import { LEGAL_DOCS_QUERY_KEY } from '@/constants/queryKeys';

interface LegalDoc {
  id: string;
  content: string;
  version: string;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<LegalDoc[], Error>>;

/**
 * Legal docs query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useLegalDocsQuery = (queryOptions: QueryOptions | undefined = undefined) => {
  return useQuery<LegalDoc[], Error>({
    queryKey: [LEGAL_DOCS_QUERY_KEY],
    queryFn: async () => {
      const docs = await fetchLegalDocs();
      return docs as LegalDoc[];
    },
    ...queryOptions,
  });
};

export default useLegalDocsQuery; 