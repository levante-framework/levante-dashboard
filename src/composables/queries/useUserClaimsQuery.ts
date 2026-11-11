import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { getIdTokenClaims } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';

/**
 * User claims data query.
 *
 * Reads the logged-in user's custom claims from their Firebase Auth ID token
 * (the deprecated Firestore `userClaims` collection is no longer used).
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
    queryFn: () => getIdTokenClaims(),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserClaimsQuery;
