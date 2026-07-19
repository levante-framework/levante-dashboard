import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import type { MaybeRefOrGetter } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchDocById } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';

/**
 * User claims data query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useUserClaimsQuery = (queryOptions?: UseQueryOptions): UseQueryReturnType => {
  const authStore = useAuthStore();
  const { getUserId } = authStore;

  const queryConditions = [() => !!getUserId()];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [USER_CLAIMS_QUERY_KEY, getUserId()],
    queryFn: () => fetchDocById(FIRESTORE_COLLECTIONS.USER_CLAIMS, getUserId()),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserClaimsQuery;
