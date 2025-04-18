import { computed, type ComputedRef, toValue, type Ref, ref, type MaybeRef } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - computeQueryOverrides is not needed
// import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// Import necessary types and the page fetcher from orgs helper
import { orgPageFetcher, type OrgData, type AdminOrgs, type OrderBy } from '@/helpers/query/orgs';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery';
import useUserType from '@/composables/useUserType';
import { ORGS_TABLE_QUERY_KEY } from '@/constants/queryKeys';

/**
 * Orgs Table query.
 *
 * Fetches orgs for the data table on the List Orgs page.
 *
 * @param {MaybeRef<string>} activeOrgType – The active org type (district, school, etc.).
 * @param {MaybeRef<string | null>} selectedDistrict – The selected district ID.
 * @param {MaybeRef<string | null>} selectedSchool – The selected school ID.
 * @param {MaybeRef<OrderBy[] | undefined>} orderBy – The order by configuration.
 * @param {UseQueryOptions<OrgData[], Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgData[], Error>} The TanStack query result.
 */
function useOrgsTableQuery(
  activeOrgType: MaybeRef<string>,
  selectedDistrict: MaybeRef<string | null>,
  selectedSchool: MaybeRef<string | null>,
  orderBy: MaybeRef<OrderBy[] | undefined>,
  queryOptions?: UseQueryOptions<OrgData[], Error>
): UseQueryReturnType<OrgData[], Error> {

  // Fetch the user claims. Assume default behavior is sufficient for enabling.
  const { data: userClaims } = useUserClaimsQuery(queryOptions);

  // Get admin status and administration orgs. Cast claims ref type for compatibility.
  const { isSuperAdmin } = useUserType(userClaims as any);
  const adminOrgs: ComputedRef<AdminOrgs | undefined> = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

  // Check if claims are loaded.
  const claimsLoaded: ComputedRef<boolean> = computed(() => !_isEmpty(userClaims.value?.claims));

  // The final enabled state depends on the initial option AND claims being loaded.
  const finalEnabledState = computed(() => {
    const enabledOption = queryOptions?.enabled;
    const isEnabledFromOptions = enabledOption === undefined || toValue(enabledOption) === true;
    return isEnabledFromOptions && claimsLoaded.value;
  });

  // Create computed refs for parameters passed to fetcher
  const activeOrgTypeRef = computed(() => toValue(activeOrgType));
  const selectedDistrictRef = computed(() => toValue(selectedDistrict));
  const selectedSchoolRef = computed(() => toValue(selectedSchool));
  const orderByRef = computed(() => toValue(orderBy));

  const queryKey: ComputedRef<QueryKey> = computed(() => [
    ORGS_TABLE_QUERY_KEY,
    activeOrgTypeRef.value,
    selectedDistrictRef.value,
    selectedSchoolRef.value,
    // Consider stringifying orderBy for stable key if it's complex
    JSON.stringify(orderByRef.value) ?? 'defaultOrder',
  ]);

  return useQuery<OrgData[], Error>({
    // Spread original options first
    ...queryOptions,
    queryKey,
    queryFn: () => {
      // Add safety check for non-super-admins
      if (!isSuperAdmin.value && !claimsLoaded.value) {
        console.warn('OrgsTableQuery: Claims not loaded for non-super-admin, returning empty.');
        return Promise.resolve([]);
      }
      // Pass computed refs to the page fetcher
      return orgPageFetcher(
        activeOrgTypeRef,
        selectedDistrictRef,
        selectedSchoolRef,
        orderByRef, // Pass the computed ref directly
        ref(100000), // Large page size as per original JS
        ref(0),
        isSuperAdmin, // Pass boolean ref
        adminOrgs // Pass AdminOrgs ref
      );
    },
    // Override enabled with the final computed state
    enabled: finalEnabledState,
  });
}

export default useOrgsTableQuery; 