import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the input structure for the task being updated
interface TaskUpdateInput {
  // Define properties expected by roarfirekit.updateTaskOrVariant for a task
  id: string; // Assuming an ID is needed for update
  name?: string;
  // Add other task-specific fields like registered, testData, demoData etc.
  [key: string]: any; // Use a more specific type if known
}

/**
 * Update Task mutation.
 *
 * TanStack mutation to update a task and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useAddTaskMutation` into a single `useUpsertTaskMutation`.
 *
 * @returns {UseMutationReturnType<void, Error, TaskUpdateInput, unknown>} The mutation object returned by `useMutation`.
 */
const useUpdateTaskMutation = (): UseMutationReturnType<void, Error, TaskUpdateInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, TaskUpdateInput, unknown>({
    mutationKey: [TASK_UPDATE_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (task: TaskUpdateInput): Promise<void> => {
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming updateTaskOrVariant returns Promise<void>
      await authStore.roarfirekit.updateTaskOrVariant(task);
    },
    onSuccess: () => {
      // Invalidate tasks query on success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useUpdateTaskMutation; 