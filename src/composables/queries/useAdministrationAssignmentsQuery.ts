import { computed, type MaybeRef, toValue, type Ref, type ComputedRef, ref } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - computeQueryOverrides needs conversion
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - assignmentFetchAll likely needs type refinement
import { assignmentFetchAll, type AssignmentData } from '@/helpers/query/assignments';
import { ADMINISTRATION_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';

/**
 * Administration assignments query.
 *
 * Fetches all assignments for a given administration context (admin, orgType, orgId).
 *
 * @param {MaybeRef<string | null>} administrationId – The administration ID.
 * @param {MaybeRef<string | null>} orgType – The organisation type.
 * @param {MaybeRef<string | null>} orgId – The organisation ID.
 * @param {UseQueryOptions<AssignmentData[], Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<AssignmentData[], Error>} The TanStack query result.
 */
function useAdministrationAssignmentsQuery(
  administrationId: MaybeRef<string | null>,
  orgType: MaybeRef<string | null>,
  orgId: MaybeRef<string | null>,
  queryOptions?: UseQueryOptions<AssignmentData[], Error>
): UseQueryReturnType<AssignmentData[], Error> {

  const authStore = useAuthStore();
  // Assuming roarUid is Ref<string | undefined | null>
  const { roarUid } = storeToRefs(authStore);

  // Create computed refs for parameters
  const computedAdminId = computed(() => toValue(administrationId));
  const computedOrgType = computed(() => toValue(orgType));
  const computedOrgId = computed(() => toValue(orgId));
  const computedRoarUid = computed(() => toValue(roarUid)); // Needed for query condition

  // Define query conditions for enabling the query
  const queryConditions = [
    (): boolean => !!computedAdminId.value,
    (): boolean => !!computedOrgType.value,
    (): boolean => !!computedOrgId.value,
    (): boolean => !!computedRoarUid.value, // Ensure user is authenticated
  ];

  // Calculate enabled state using helper (cast options to any)
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {} as any);

  const queryKey: ComputedRef<QueryKey> = computed(() => [
    ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
    computedAdminId.value,
    `${computedOrgType.value}-${computedOrgId.value}`,
  ]);

  return useQuery<AssignmentData[], Error>({
    queryKey,
    queryFn: () => {
      // assignmentFetchAll expects Refs
      // Convert computed refs back to simple refs or adjust fetcher
      // For now, pass computed values directly - This might break if fetcher strictly expects Refs
      // TODO: Verify assignmentFetchAll signature/implementation in assignments.ts
      return assignmentFetchAll(
          computedAdminId, 
          computedOrgType, 
          computedOrgId,
          ref(true) // includeScores is true in original JS
      );
    },
    enabled: isQueryEnabled, // Use computed enabled state
    // Cast spread options to any due to computeQueryOverrides interaction
    ...(queryOptions as any),
  });
}

export default useAdministrationAssignmentsQuery; 