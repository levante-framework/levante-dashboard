import { useQuery } from '@tanstack/vue-query';
import { computed, unref, type MaybeRefOrGetter } from 'vue';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';

const USERS_DATA_QUERY_KEY = 'usersData';

/**
 * Multiple users data query.
 *
 * Fetches multiple users' data in a single batch query for better performance.
 *
 * @param userIds – Array of user IDs to fetch.
 * @param select – Optional array of fields to select from the user documents.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUsersDataQuery = (
  userIds: MaybeRefOrGetter<string[] | undefined | null> = [],
  select: MaybeRefOrGetter<string[]> = ['displayName', 'email'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryOptions?: any,
) => {
  const userIdsArray = computed(() => {
    const value = unref(userIds);
    return Array.isArray(value) ? value : [];
  });
  const selectFields = computed(() => {
    const value = unref(select);
    return Array.isArray(value) ? value : ['displayName', 'email'];
  });
  
  const queryConditions = [() => userIdsArray.value.length > 0];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [USERS_DATA_QUERY_KEY, userIdsArray.value, selectFields.value],
    queryFn: () => fetchDocumentsById(FIRESTORE_COLLECTIONS.USERS, userIdsArray.value, selectFields.value),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUsersDataQuery;
