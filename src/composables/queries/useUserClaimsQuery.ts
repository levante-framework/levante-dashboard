import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchDocById } from '@/helpers/query/utils';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface UserClaims {
  [key: string]: any;
}

/**
 * User claims data query.
 *
 * @param {UseQueryOptions<UserClaims> | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult<UserClaims>} The TanStack query result.
 */
const useUserClaimsQuery = (
  queryOptions: UseQueryOptions<UserClaims> | undefined = undefined
): UseQueryResult<UserClaims> => {
  const authStore = useAuthStore();
  const { uid } = storeToRefs(authStore);

  const queryConditions = [() => !!uid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [USER_CLAIMS_QUERY_KEY, uid],
    queryFn: () => fetchDocById(FIRESTORE_COLLECTIONS.USER_CLAIMS, uid),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserClaimsQuery; 