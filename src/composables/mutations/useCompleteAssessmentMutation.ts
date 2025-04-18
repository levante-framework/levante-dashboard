import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { COMPLETE_ASSESSMENT_MUTATION_KEY } from '@/constants/mutationKeys';
import { USER_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';

// Define the structure of the variables passed to the mutation function
interface CompleteAssessmentVariables {
  adminId: string; // Assuming string type, adjust if needed (e.g., number)
  taskId: string;
}

/**
 * Complete Assessment mutation.
 *
 * Mutation to mark a task as complete in the user's assignments subcollection and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useCompleteAssessmentMutation = (): UseMutationReturnType<void, Error, CompleteAssessmentVariables, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, CompleteAssessmentVariables, unknown>({
    mutationKey: COMPLETE_ASSESSMENT_MUTATION_KEY,
    mutationFn: async ({ adminId, taskId }: CompleteAssessmentVariables): Promise<void> => {
      // Check if roarfirekit is initialized before attempting to use it.
      if (!authStore.isFirekitInit || !authStore.roarfirekit) {
        // Consider using a more specific error type if available
        throw new Error('Roarfirekit is not initialized. Cannot complete assessment.');
      }
      // Assuming roarfirekit.completeAssessment is async and returns void or Promise<void>
      await authStore.roarfirekit.completeAssessment(adminId, taskId);
    },
    onSuccess: (data: void, variables: CompleteAssessmentVariables) => {
      console.log(`Assessment completion mutation successful for adminId: ${variables.adminId}, taskId: ${variables.taskId}`);
      // Invalidate user assignments query which has the task status info.
      queryClient.invalidateQueries({ queryKey: [USER_ASSIGNMENTS_QUERY_KEY] });
    },
    onError: (error: Error, variables: CompleteAssessmentVariables) => {
      console.error(`Error completing assessment for adminId: ${variables.adminId}, taskId: ${variables.taskId}:`, error);
    },
    retry: 3,
  });
};

export default useCompleteAssessmentMutation; 