import { computed, type ComputedRef, toValue, type Ref } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - computeQueryOverrides is not needed
// import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { orgFetcher, type OrgData, type AdminOrgs } from '@/helpers/query/orgs';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery';
import useUserType from '@/composables/useUserType';
import { GROUPS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

/**
 * Groups List query.
 *
 * Fetches a list of groups, respecting user claims for minimal admins.
 *
 * @param {UseQueryOptions<OrgData[], Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgData[], Error>} The TanStack query result.
 */
function useGroupsListQuery(
  queryOptions?: UseQueryOptions<OrgData[], Error>
): UseQueryReturnType<OrgData[], Error> {

  // Fetch the user claims. Assume default behavior is sufficient for enabling.
  const { data: userClaims } = useUserClaimsQuery(queryOptions);

  // Get admin status and administration orgs. Cast claims ref type for compatibility.
  const { isSuperAdmin } = useUserType(userClaims as any);
  const administrationOrgs: ComputedRef<AdminOrgs | undefined> = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

  // Check if claims are loaded.
  const claimsLoaded: ComputedRef<boolean> = computed(() => !_isEmpty(userClaims.value?.claims));

  // The final enabled state depends on the initial option AND claims being loaded.
  const finalEnabledState = computed(() => {
    const enabledOption = queryOptions?.enabled;
    const isEnabledFromOptions = enabledOption === undefined || toValue(enabledOption) === true;
    return isEnabledFromOptions && claimsLoaded.value;
  });

  const queryKey: QueryKey = [GROUPS_LIST_QUERY_KEY];

  return useQuery<OrgData[], Error>({
    // Spread original options first
    ...queryOptions,
    queryKey,
    queryFn: () => {
      // Add safety check for non-super-admins
      if (!isSuperAdmin.value && !claimsLoaded.value) {
        console.warn('GroupsListQuery: Claims not loaded for non-super-admin, returning empty.');
        return Promise.resolve([]);
      }
      // Groups don't have a parent org concept like schools/classes
      return orgFetcher(
        FIRESTORE_COLLECTIONS.GROUPS,
        null, // Pass null for selectedParentId
        isSuperAdmin.value,
        administrationOrgs.value
      );
    },
    // Override enabled with the final computed state
    enabled: finalEnabledState,
  });
}

export default useGroupsListQuery; 