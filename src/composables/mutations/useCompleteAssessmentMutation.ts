import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { COMPLETE_ASSESSMENT_MUTATION_KEY } from '@/constants/mutationKeys';
import { USER_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';

interface CompleteAssessmentParams {
  adminId: string;
  taskId: string;
}

/**
 * Complete Assessment mutation.
 *
 * Mutation to mark a task as complete in the user's assignments subcollection and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useCompleteAssessmentMutation = (): UseMutationReturnType<void, Error, CompleteAssessmentParams, unknown> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: COMPLETE_ASSESSMENT_MUTATION_KEY,
    mutationFn: async ({ adminId, taskId }: CompleteAssessmentParams): Promise<void> => {
      // Check if roarfirekit is initialized before attempting to use it.
      if (!authStore.isFirekitInit() || !authStore.roarfirekit) {
        throw new Error('Roarfirekit is not initialized. Cannot complete assessment.');
      }
      await authStore.roarfirekit.completeAssessment(adminId, taskId);
    },
    meta: { skipGlobalErrorLogging: true },
    onSuccess: (_, variables: CompleteAssessmentParams): void => {
      logger.capture('Assignment Complete', { adminId: variables.adminId, taskId: variables.taskId });
      console.log(
        `Assessment completion mutation successful for adminId: ${variables.adminId}, taskId: ${variables.taskId}`,
      );
      // Invalidate user assignments query which has the task status info.
      // Cannot do optimistic updates per Max's comment in useUpsertAdministrationMutation.js :(
      queryClient.invalidateQueries({ queryKey: [USER_ASSIGNMENTS_QUERY_KEY] });
    },
    onError: (error: Error, variables: CompleteAssessmentParams): void => {
      logger.error(new Error('Failed to complete assessment', { cause: error }), {
        tags: { composable: 'useCompleteAssessmentMutation' },
        adminId: variables.adminId,
        taskId: variables.taskId,
      });
    },
    retry: 3,
  });
};

export default useCompleteAssessmentMutation;
