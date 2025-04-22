import { computed, type MaybeRef, toValue, type Ref, type ComputedRef } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
// @ts-ignore - computeQueryOverrides needs conversion
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// Import fetcher and necessary types from orgs helper
import { fetchTreeOrgs, type OrgTree, type AssignedOrgs } from '@/helpers/query/orgs';
import { DSGF_ORGS_QUERY_KEY } from '@/constants/queryKeys';

/**
 * District School Groups Families (DSGF) Orgs query.
 *
 * Fetches all organizations assigned to a specific administration.
 *
 * @TODO: Decouple the assignedOrgs from the query parameter, ideally letting this query request that data
 * independently. This would allow the query to be more flexible and reusable, but currently not a hard requirement.
 *
 * @param {MaybeRef<string | null>} administrationId – The ID of the administration.
 * @param {MaybeRef<AssignedOrgs | null>} assignedOrgs – The orgs assigned to the administration.
 * @param {UseQueryOptions<OrgTree, Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgTree, Error>} The TanStack query result.
 */
function useDsgfOrgQuery(
  administrationId: MaybeRef<string | null>,
  assignedOrgs: MaybeRef<AssignedOrgs | null>,
  queryOptions?: UseQueryOptions<OrgTree, Error>
): UseQueryReturnType<OrgTree, Error> {

  const computedAdminId = computed(() => toValue(administrationId));
  const computedAssignedOrgs = computed(() => toValue(assignedOrgs));

  // Define query conditions for enabling the query
  const queryConditions = [
      (): boolean => !!computedAdminId.value,
      (): boolean => !!computedAssignedOrgs.value // Ensure assignedOrgs object is provided
  ];

  // Calculate enabled state using helper (cast options to any)
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {} as any);

  const queryKey: ComputedRef<QueryKey> = computed(() => [
      DSGF_ORGS_QUERY_KEY,
      computedAdminId.value
  ]);

  return useQuery<OrgTree, Error>({
    queryKey,
    queryFn: () => {
      // Ensure required params are not null before calling fetcher
      if (!computedAdminId.value || !computedAssignedOrgs.value) {
        console.warn('useDsgfOrgQuery: administrationId or assignedOrgs is null/undefined.');
        // Return an empty OrgTree structure or handle error appropriately
        return Promise.resolve({ districts: [], schools: [], classes: [], groups: [], families: [] });
      }
      // fetchTreeOrgs expects string and AssignedOrgs, not Refs
      return fetchTreeOrgs(computedAdminId.value, computedAssignedOrgs.value);
    },
    enabled: isQueryEnabled, // Use computed enabled state
    // Cast spread options to any due to computeQueryOverrides interaction
    ...(queryOptions as any),
  });
}

export default useDsgfOrgQuery; 