import { computed, type Ref, type ComputedRef, type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { orgFetcher } from '@/helpers/query/orgs';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery.ts';
import { GROUPS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for group data
interface GroupData {
  id: string;
  name?: string;
  // Add other expected group properties
  [key: string]: any;
}

// Use a simpler options type, explicitly omitting enabled
type GroupsListQueryOptions = Omit<
  UseQueryOptions<GroupData[], Error, GroupData[], ReadonlyArray<string>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * Groups List query.
 *
 * @param {MaybeRef<boolean | undefined>} enabled - Explicit enabled state.
 * @param {GroupsListQueryOptions | undefined} queryOptions – Optional TanStack query options (excluding enabled).
 * @returns {UseQueryReturnType<GroupData[], Error>} The TanStack query result.
 */
const useGroupsListQuery = (
  enabled: MaybeRef<boolean | undefined> = true, // Add enabled parameter
  queryOptions: GroupsListQueryOptions = {}, // Options exclude enabled
): UseQueryReturnType<GroupData[], Error> => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    // Pass the explicit enabled state here
    enabled: enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims as Ref<UserClaimsData | null>); // Keep cast
  const administrationOrgs: ComputedRef<Record<string, string[]> | undefined> = computed(
    () => (userClaims.value as UserClaimsData | null)?.claims?.minimalAdminOrgs, // Keep cast
  );

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims.value?.claims));
  // Add explicit enabled state to conditions
  const queryConditions: Condition[] = [() => claimsLoaded.value, () => unref(enabled) ?? true];
  // Pass options excluding enabled
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<GroupData[], Error, GroupData[], ReadonlyArray<string>>({
    queryKey: [GROUPS_LIST_QUERY_KEY],
    queryFn: async (): Promise<GroupData[]> => {
      // Fetch org data, ensure return type matches or cast
      const result = await orgFetcher(
        FIRESTORE_COLLECTIONS.GROUPS,
        undefined, // Pass undefined for orgId to fetch list
        isSuperAdmin.value, // Pass boolean value
        administrationOrgs.value, // Pass Record<string, string[]> | undefined
        undefined // Pass undefined for select fields
      );
      return result as GroupData[]; // Keep cast
    },
    enabled: isQueryEnabled, // Use computed enabled state
    ...options, // Spread other options
  });
};

export default useGroupsListQuery;
