import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, unref } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchDocById } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';

/**
 * User profile data query.
 *
 * @param userId – The user ID to fetch, set to a falsy value to fetch the current user.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUserDataQuery = (
  userId: MaybeRefOrGetter<string | undefined | null> = undefined,
  queryOptions?: UseQueryOptions,
): UseQueryReturnType => {
  const authStore = useAuthStore();
  const { getUserId } = authStore;

  const uid = computed(() => unref(userId) || getUserId());
  const queryConditions = [() => !!uid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [USER_DATA_QUERY_KEY, uid.value],
    queryFn: () => fetchDocById(FIRESTORE_COLLECTIONS.USERS, uid.value),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserDataQuery;
