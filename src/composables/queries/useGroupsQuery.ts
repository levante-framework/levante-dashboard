import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import type { Ref } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { GROUPS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides, type QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';

/**
 * Group Query
 *
 * @param groupIds – A Vue ref containing an array of group IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useGroupsQuery = (
  groupIds: Ref<Array<string>>,
  queryOptions?: QueryOptionsWithEnabled,
): UseQueryReturnType<any, Error> => {
  // Ensure all necessary data is loaded before enabling the query.
  const conditions = [() => hasArrayEntries(groupIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [GROUPS_QUERY_KEY, groupIds],
    queryFn: async () => await fetchDocumentsById(FIRESTORE_COLLECTIONS.GROUPS, groupIds.value),
    enabled: isQueryEnabled,
    meta: {
      errorMessage: 'Failed to fetch groups by ID',
      errorContext: {
        tags: { composable: 'useGroupsQuery' },
        groupIds: groupIds.value,
      },
    },
    ...options,
  });
};

export default useGroupsQuery;
