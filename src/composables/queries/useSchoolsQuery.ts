import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { logger } from '@/logger';

/**
 * School Query
 *
 * @param {Array} schoolIds – The array of school IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useSchoolsQuery = (schoolIds, queryOptions?: UseQueryOptions): UseQueryReturnType => {
  // Ensure all necessary data is loaded before enabling the query.
  const conditions = [() => hasArrayEntries(schoolIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [SCHOOLS_QUERY_KEY, schoolIds],
    queryFn: async () => {
      try {
        return await fetchDocumentsById(FIRESTORE_COLLECTIONS.SCHOOLS, schoolIds);
      } catch (error) {
        logger.error(new Error('Failed to fetch schools by ID', { cause: error }), {
          tags: { function: 'useSchoolsQuery' },
        });
        return [];
      }
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useSchoolsQuery;
