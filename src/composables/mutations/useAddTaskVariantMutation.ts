import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the input structure (can potentially reuse from useAddTaskMutation.ts)
interface TaskVariantInput {
  // Define properties expected by roarfirekit.registerTaskVariant
  taskId: string;
  variantId: string;
  // Add other properties like variantData: Record<string, any>, etc.
  [key: string]: any;
}

/**
 * Add Task Variant mutation.
 *
 * TanStack mutation to add a task variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useUpdateTaskVariantMutation` into a single `useUpsertTaskVariantMutation`.
 *
 * @returns {UseMutationReturnType<void, Error, TaskVariantInput, unknown>} The mutation object returned by `useMutation`.
 */
const useAddTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, TaskVariantInput, unknown>({
    mutationKey: [TASK_VARIANT_ADD_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (variant: TaskVariantInput): Promise<void> => {
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming registerTaskVariant returns Promise<void>
      await authStore.roarfirekit.registerTaskVariant({ ...variant });
    },
    onSuccess: () => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useAddTaskVariantMutation; 