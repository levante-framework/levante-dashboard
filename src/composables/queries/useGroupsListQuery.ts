import { computed } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { orgFetcher } from '@/helpers/query/orgs';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { GROUPS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface Group {
  id: string;
  name: string;
  [key: string]: any;
}

interface UserType {
  isSuperAdmin: boolean;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<Group[], Error>>;

/**
 * Groups List query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useGroupsListQuery = (queryOptions: QueryOptions | undefined = undefined) => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    queryKey: ['userClaims'],
    enabled: queryOptions?.enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims) as UserType;
  const administrationOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<Group[], Error>({
    queryKey: [GROUPS_LIST_QUERY_KEY],
    queryFn: async () => {
      const groups = await orgFetcher(FIRESTORE_COLLECTIONS.GROUPS, undefined, isSuperAdmin, administrationOrgs);
      return groups as Group[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useGroupsListQuery; 