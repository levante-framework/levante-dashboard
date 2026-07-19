import { useQuery } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computed, type MaybeRefOrGetter } from 'vue';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useUserType from '@/composables/useUserType';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { GROUPS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { orgFetcher } from '@/helpers/query/orgs';

/**
 * Groups List query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useGroupsListQuery = (queryOptions?: UseQueryOptions): UseQueryReturnType => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    enabled: queryOptions?.enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims);
  const administrationOrgs = computed(() => userClaims.value?.claims?.adminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [GROUPS_LIST_QUERY_KEY],
    queryFn: () => orgFetcher(FIRESTORE_COLLECTIONS.GROUPS, undefined, isSuperAdmin, administrationOrgs),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useGroupsListQuery;
