import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { type Ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { getUserAssignments } from '@/helpers/query/assignments';
import { USER_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';

// Placeholder type for user assignment data
interface UserAssignmentData {
  id: string;
  taskId?: string;
  // Add other expected properties
  [key: string]: any;
}

// Define specific query options type
type UserAssignmentsQueryOptions = Omit<
  UseQueryOptions<UserAssignmentData[], Error, UserAssignmentData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled' // Keep enabled
>;

/**
 * User assignments query.
 *
 * @param {UserAssignmentsQueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<UserAssignmentData[], Error>} The TanStack query result.
 */
const useUserAssignmentsQuery = (
  queryOptions: UserAssignmentsQueryOptions = {},
): UseQueryReturnType<UserAssignmentData[], Error> => {
  const authStore = useAuthStore();
  const { roarUid }: { roarUid: Ref<string | undefined> } = storeToRefs(authStore);

  const queryConditions: Condition[] = [() => !!roarUid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<UserAssignmentData[], Error, UserAssignmentData[], ReadonlyArray<unknown>>({
    // Pass roarUid ref directly into query key
    queryKey: [USER_ASSIGNMENTS_QUERY_KEY, roarUid],
    queryFn: async (): Promise<UserAssignmentData[]> => {
      const currentRoarUid = roarUid.value;
      if (!currentRoarUid) {
        // If roarUid is not available, return empty array
        return Promise.resolve([]);
      }
      // Ensure getUserAssignments returns the correct type or cast
      const result = await getUserAssignments(currentRoarUid);
      return result as UserAssignmentData[];
    },
    // Refetch on window focus for MEFS assessments as those are opened in a separate tab.
    refetchOnWindowFocus: 'always',
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserAssignmentsQuery;
