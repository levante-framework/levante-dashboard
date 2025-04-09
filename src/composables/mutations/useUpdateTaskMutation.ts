import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure of the task data being updated
// Should match parameters for roarfirekit.updateTaskOrVariant
interface TaskUpdateData {
  id: string; // ID is likely required for an update
  // Include other updatable fields
  name?: string;
  [key: string]: any;
}

// Define context type
type UpdateTaskContext = void;

/**
 * Update Task mutation.
 *
 * TanStack mutation to update a task and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useAddTaskMutation` into a single `useUpsertTaskMutation`. Currently difficult to
 * achieve due to the underlaying firekit functions being different.
 *
 * @returns {UseMutationReturnType<void, Error, TaskUpdateData, UpdateTaskContext>} The mutation object returned by `useMutation`.
 */
const useUpdateTaskMutation = (): UseMutationReturnType<void, Error, TaskUpdateData, UpdateTaskContext> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, TaskUpdateData, UpdateTaskContext>({
    mutationKey: [TASK_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (task: TaskUpdateData): Promise<void> => {
      // Ensure roarfirekit and method exist
      if (!authStore.roarfirekit?.updateTaskOrVariant) {
        throw new Error('Roarfirekit not initialized or updateTaskOrVariant method missing.');
      }
      await authStore.roarfirekit.updateTaskOrVariant(task);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate tasks query
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useUpdateTaskMutation] Failed to update task:', error, 'Task Data:', variables);
    },
  });
};

export default useUpdateTaskMutation;
