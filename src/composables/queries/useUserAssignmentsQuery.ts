import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { computed, type Ref, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// Import the specific function and type from the converted assignments helper
// @ts-ignore - assignments.ts uses ignored helpers
import { getUserAssignments, type AssignmentData } from '@/helpers/query/assignments';
import { USER_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';

/**
 * User assignments query.
 *
 * Fetches assignments for the currently authenticated user.
 *
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUserAssignmentsQuery = (
    queryOptions?: QueryOptions<AssignmentData[], Error>
): UseQueryReturnType<AssignmentData[], Error> => {

  const authStore = useAuthStore();
  // roarUid from store is likely Ref<string | undefined>
  const { roarUid } = storeToRefs(authStore);

  // Create a computed ref that converts undefined to null for the helper function
  const roarUidForQuery: ComputedRef<string | null> = computed(() => roarUid.value ?? null);

  // Query is enabled only if roarUid has a value (not null or undefined)
  const queryConditions = [(): boolean => !!roarUid.value];
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Query key depends on the user ID
  const queryKey = computed<QueryKey>(() => [
      USER_ASSIGNMENTS_QUERY_KEY,
      roarUid.value // Use original value for key consistency
  ]);

  return useQuery<AssignmentData[], Error>({
    queryKey,
    // Pass the computed ref with null instead of undefined
    queryFn: () => getUserAssignments(roarUidForQuery),
    // Refetch on window focus for MEFS assessments as those are opened in a separate tab.
    refetchOnWindowFocus: 'always',
    enabled: isQueryEnabled,
    // Cast spread options to any to bypass type checking issues
    ...(queryOptions as any),
  });
};

export default useUserAssignmentsQuery; 