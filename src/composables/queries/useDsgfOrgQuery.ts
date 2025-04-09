import { type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { DSGF_ORGS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { fetchTreeOrgs } from '@/helpers/query/orgs'; // Assume returns DsgfOrgData[] or similar structure

// Placeholder type for the hierarchical org data
// This might be a complex nested structure (e.g., District with Schools[], etc.)
// Using a simple placeholder for now.
interface DsgfOrgData {
  id: string;
  name?: string;
  type?: 'district' | 'school' | 'group' | 'family'; // Example
  children?: DsgfOrgData[];
  [key: string]: any;
}

// Placeholder type for the assignedOrgs input object
// This structure needs to be defined based on what fetchTreeOrgs expects
interface AssignedOrgs {
  districts?: string[];
  schools?: string[];
  groups?: string[];
  families?: string[];
  [key: string]: any; // Allow flexibility
}

// Use a simpler options type, explicitly omitting enabled
type DsgfOrgQueryOptions = Omit<
  UseQueryOptions<DsgfOrgData[], Error, DsgfOrgData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * District School Groups Families (DSGF) Orgs query.
 *
 * @TODO: Decouple the assignedOrgs from the query parameter, ideally letting this query request that data
 * independently. This would allow the query to be more flexible and reusable, but currently not a hard requirement.
 *
 * @param {MaybeRef<string | undefined>} administrationId – The ID of the administration to fetch DSGF orgs for.
 * @param {MaybeRef<AssignedOrgs | undefined>} assignedOrgs – The orgs assigned to the current administration.
 * @param {MaybeRef<boolean | undefined>} enabled - Explicit enabled state.
 * @param {DsgfOrgQueryOptions | undefined} queryOptions – Optional TanStack query options (excluding enabled).
 * @returns {UseQueryReturnType<DsgfOrgData[], Error>} The TanStack query result.
 */
const useDsgfOrgQuery = (
  administrationId: MaybeRef<string | undefined>,
  assignedOrgs: MaybeRef<AssignedOrgs | undefined>,
  enabled: MaybeRef<boolean | undefined> = true, // Add enabled parameter
  queryOptions: DsgfOrgQueryOptions = {}, // Options exclude enabled
): UseQueryReturnType<DsgfOrgData[], Error> => {
  // Ensure all necessary data is available before enabling the query.
  const queryConditions: Condition[] = [
    () => !!unref(administrationId),
    () => !!unref(assignedOrgs), // Check if assignedOrgs object is present
    () => unref(enabled) ?? true, // Add explicit enabled state
  ];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<DsgfOrgData[], Error, DsgfOrgData[], ReadonlyArray<unknown>>({
    // Pass refs directly to queryKey if needed, or unwrap for stability
    queryKey: [DSGF_ORGS_QUERY_KEY, administrationId], // Keeping simple key from JS
    queryFn: async (): Promise<DsgfOrgData[]> => {
      const currentAdminId = unref(administrationId);
      const currentAssignedOrgs = unref(assignedOrgs);

      // Need both adminId and assignedOrgs to fetch
      if (!currentAdminId || !currentAssignedOrgs) {
        return Promise.resolve([]);
      }
      // Fetch tree orgs, ensure return type matches or cast
      const result = await fetchTreeOrgs(currentAdminId, currentAssignedOrgs);
      return result as DsgfOrgData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDsgfOrgQuery;
