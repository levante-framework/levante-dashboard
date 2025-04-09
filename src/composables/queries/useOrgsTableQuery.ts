import { computed, ref, unref, toValue, type MaybeRef, watch, toRaw } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryObserverOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { orgPageFetcher } from '@/helpers/query/orgs';
import { ORGS_TABLE_QUERY_KEY } from '@/constants/queryKeys';

// Define more specific types for input parameters
type MaybeRefString = MaybeRef<string | undefined>;
type MaybeRefOrderBy = MaybeRef<any>; // Replace 'any' with a specific OrderBy type if available

// Define the expected return type for orgPageFetcher (use 'any' for now)
type OrgData = any;
// Define the error type
type QueryError = Error;

/**
 * Orgs Table query.
 *
 * Fetches all orgs assigned to the current user account. This query is intended to be used by the List Orgs page that
 * contains a tabbed data table with orgs (districts, schools, etc.) assigned to the user.
 *
 * @TODO: Explore the possibility of removing this query in favour of more granular queries for each org type.
 *
 * @param {MaybeRefString} activeOrgType – The active org type (district, school, etc.).
 * @param {MaybeRefString} selectedDistrict – The selected district ID.
 * @param {MaybeRefString} selectedSchool – The selected school ID.
 * @param {MaybeRefOrderBy} orderBy – The order by field.
 * @param {QueryObserverOptions | undefined} queryOptions – Optional TanStack query options (including enabled).
 * @returns {UseQueryReturnType<OrgData, QueryError>} The TanStack query result.
 */
const useOrgsTableQuery = (
  activeOrgType: MaybeRefString,
  selectedDistrict: MaybeRefString,
  selectedSchool: MaybeRefString,
  orderBy: MaybeRefOrderBy,
  queryOptions: QueryObserverOptions<OrgData, QueryError> | undefined = undefined
): UseQueryReturnType<OrgData, QueryError> => {
  // Determine if the claims query itself should be enabled
  const claimsQueryEnabled = computed(() => queryOptions?.enabled ?? true);
  const { data: userClaims } = useUserClaimsQuery({ enabled: claimsQueryEnabled });

  // Get the admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims);
  const adminOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => {
      const claimsObject = userClaims.value?.claims;
      // console.log('[useOrgsTableQuery] Checking claimsLoaded. Value of userClaims.value?.claims:', claimsObject);
      // console.log('[useOrgsTableQuery] Checking claimsLoaded. Value of toRaw(userClaims.value?.claims):', toRaw(claimsObject));
      const isEmptyResult = _isEmpty(toRaw(claimsObject));
      // console.log('[useOrgsTableQuery] Result of _isEmpty(toRaw(claimsObject)):', isEmptyResult);
      return !isEmptyResult;
  });

  // Log the initial state and watch claimsLoaded directly
  // console.log(`[useOrgsTableQuery] Initial claimsLoaded state: ${claimsLoaded.value}`);
  // watch(claimsLoaded, (newValue, oldValue) => {
  //     console.log(`[useOrgsTableQuery] claimsLoaded changed from ${oldValue} to ${newValue}`);
      // Optionally log the claims again here if needed for debugging
      // console.log('[useOrgsTableQuery] userClaims.value when claimsLoaded changed:', toRaw(userClaims.value));
  // });

  // Pass queryOptions directly, TanStack Query handles the `enabled: claimsLoaded` ref
  return useQuery<OrgData, QueryError>({
    queryKey: [ORGS_TABLE_QUERY_KEY, activeOrgType, selectedDistrict, selectedSchool, orderBy],
    queryFn: () => {
        // console.log('[useOrgsTableQuery] Calling orgPageFetcher with:');
        // console.log('  - activeOrgType:', toValue(activeOrgType));
        // console.log('  - selectedDistrict:', toValue(selectedDistrict));
        // console.log('  - selectedSchool:', toValue(selectedSchool));
        // console.log('  - isSuperAdmin:', toValue(isSuperAdmin));
        // console.log('  - adminOrgs:', JSON.stringify(toValue(adminOrgs), null, 2));

        return orgPageFetcher(
          activeOrgType,
          selectedDistrict,
          selectedSchool,
          orderBy,
          ref(100000),
          ref(0),
          isSuperAdmin,
          adminOrgs,
        );
    },
    // Use the computed ref directly for enabled state
    enabled: claimsLoaded,
    // Spread other options from the input, letting enabled above take precedence
    ...(queryOptions ?? {})
  });
};

export default useOrgsTableQuery;
