import { computed, type MaybeRef, toValue, type Ref, type ComputedRef } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
// @ts-ignore - computeQueryOverrides needs conversion
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - fetchDocById likely needs type refinement
import { fetchDocById, type ProcessedDocument } from '@/helpers/query/utils';
import { USER_ADMINISTRATION_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Define AssignmentData based on the expected structure from fetchDocById
// and potential assignment-specific fields
export interface AssignmentData extends ProcessedDocument {
  assessments?: any[]; // Placeholder, refine based on actual structure
  // Add other known assignment document fields
}

/**
 * User administration assignments query.
 *
 * Fetches a specific assignment document for a user within an administration context.
 *
 * @param {MaybeRef<string | null>} userId – The user ID.
 * @param {MaybeRef<string | null>} administrationId – The administration ID.
 * @param {UseQueryOptions<AssignmentData | null, Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<AssignmentData | null, Error>} The TanStack query result.
 */
function useUserAdministrationAssignmentsQuery(
  userId: MaybeRef<string | null>,
  administrationId: MaybeRef<string | null>,
  queryOptions?: UseQueryOptions<AssignmentData | null, Error>
): UseQueryReturnType<AssignmentData | null, Error> {

  const computedUserId = computed(() => toValue(userId));
  const computedAdminId = computed(() => toValue(administrationId));

  // Define query conditions for enabling the query
  const queryConditions = [
    (): boolean => !!computedUserId.value,
    (): boolean => !!computedAdminId.value,
  ];

  // Calculate enabled state using helper (cast options to any)
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {} as any);

  const queryKey: ComputedRef<QueryKey> = computed(() => [
    USER_ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
    computedUserId.value,
    computedAdminId.value,
  ]);

  return useQuery<AssignmentData | null, Error>({
    queryKey,
    queryFn: async () => {
      const docPath = `${computedUserId.value}/assignments/${computedAdminId.value}`;
      // fetchDocById returns ProcessedDocument | {}
      const result = await fetchDocById(
        FIRESTORE_COLLECTIONS.USERS,
        docPath
      );
      // Return null if fetch failed (empty object), otherwise cast to AssignmentData
      return Object.keys(result).length === 0 ? null : result as AssignmentData;
    },
    enabled: isQueryEnabled, // Use computed enabled state
    // Cast spread options to any due to computeQueryOverrides interaction
    ...(queryOptions as any),
  });
}

export default useUserAdministrationAssignmentsQuery; 