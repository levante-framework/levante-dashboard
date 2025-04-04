import { useQuery } from '@tanstack/vue-query';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface School {
  [key: string]: any;
}

interface QueryOptions {
  enabled?: boolean;
  [key: string]: any;
}

/**
 * School Query
 *
 * @param {string[]} schoolIds – The array of school IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useSchoolsQuery = (schoolIds: string[], queryOptions: QueryOptions | undefined = undefined) => {
  // Ensure all necessary data is loaded before enabling the query.
  const conditions = [() => hasArrayEntries(schoolIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [SCHOOLS_QUERY_KEY, schoolIds],
    queryFn: () => fetchDocumentsById(FIRESTORE_COLLECTIONS.SCHOOLS, schoolIds),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useSchoolsQuery; 