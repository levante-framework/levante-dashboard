import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { GROUPS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { logger } from '@/logger';

/**
 * Group Query
 *
 * @param {Array} groupIds – The array of group IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useGroupsQuery = (groupIds, queryOptions?: UseQueryOptions): UseQueryReturnType => {
  // Ensure all necessary data is loaded before enabling the query.
  const conditions = [() => hasArrayEntries(groupIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [GROUPS_QUERY_KEY, groupIds],
    queryFn: async () => {
      try {
        return await fetchDocumentsById(FIRESTORE_COLLECTIONS.GROUPS, groupIds);
      } catch (error) {
        logger.error(new Error('Failed to fetch groups by ID', { cause: error }), {
          tags: { function: 'useGroupsQuery' },
        });
        return [];
      }
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useGroupsQuery;
