import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the input structure for the task/variant being added
interface TaskVariantInput {
  // Define properties expected by roarfirekit.registerTaskVariant
  // e.g., taskId: string; variantId: string; variantData: Record<string, any>; etc.
  [key: string]: any; // Use a more specific type if known
}

/**
 * Add Task mutation.
 *
 * TanStack mutation to add a task/variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useUpdateTaskMutation` into a single `useUpsertTaskMutation`.
 *
 * @returns {UseMutationReturnType<void, Error, TaskVariantInput, unknown>} The mutation object returned by `useMutation`.
 */
const useAddTaskMutation = (): UseMutationReturnType<void, Error, TaskVariantInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, TaskVariantInput, unknown>({
    mutationKey: [TASK_ADD_MUTATION_KEY], // Mutation keys should be arrays
    mutationFn: async (task: TaskVariantInput): Promise<void> => {
      // Ensure roarfirekit is available and initialized if necessary
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming registerTaskVariant is an async function returning void
      await authStore.roarfirekit.registerTaskVariant({ ...task });
    },
    onSuccess: () => {
      // Invalidate tasks query on success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
    // Optional: Add onError handler
    // onError: (error) => { console.error('Error adding task:', error); }
  });
};

export default useAddTaskMutation; 