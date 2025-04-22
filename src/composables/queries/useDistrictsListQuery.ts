import { computed, type ComputedRef, toValue, type Ref } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - computeQueryOverrides is not needed
// import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { orgFetcher, type OrgData, type AdminOrgs } from '@/helpers/query/orgs';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery';
import useUserType from '@/composables/useUserType';
import { DISTRICTS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

/**
 * Districts List query.
 *
 * Fetches a list of districts, respecting user claims for minimal admins.
 *
 * @param {UseQueryOptions<OrgData[], Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgData[], Error>} The TanStack query result.
 */
function useDistrictsListQuery(
  queryOptions?: UseQueryOptions<OrgData[], Error>
): UseQueryReturnType<OrgData[], Error> {

  // Fetch the user claims. Let its own logic (based on uid) primarily determine enabled state.
  // We pass a simple options object, potentially overriding its enabled state if needed,
  // but for now, let's assume the default behavior of useUserClaimsQuery is sufficient.
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

  const queryKey: QueryKey = [DISTRICTS_LIST_QUERY_KEY];

  return useQuery<OrgData[], Error>({
    // Spread original options first
    ...queryOptions,
    queryKey,
    queryFn: () => {
      // Need to ensure claims are loaded *before* calling fetcher if not super admin
      if (!isSuperAdmin.value && !claimsLoaded.value) {
        // This shouldn't happen if enabled logic is correct, but return empty array as fallback
        console.warn('DistrictsListQuery: Claims not loaded for non-super-admin, returning empty.');
        return Promise.resolve([]);
      }
      return orgFetcher(
        FIRESTORE_COLLECTIONS.DISTRICTS,
        null,
        isSuperAdmin.value,
        administrationOrgs.value
      );
    },
    // Override enabled with the final computed state
    enabled: finalEnabledState,
  });
}

export default useDistrictsListQuery; 