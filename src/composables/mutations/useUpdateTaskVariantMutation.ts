import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the input structure for the variant being updated
interface VariantUpdateInput {
  // Define properties expected by roarfirekit.updateTaskOrVariant
  // e.g., id: string; taskId: string; variantData: Record<string, any>; registered?: boolean; etc.
  id: string; // Assuming an ID is needed for update
  [key: string]: any; // Use a more specific type if known
}

/**
 * Update Task Variant mutation.
 *
 * TanStack mutation to update a task variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useAddTaskVariantMutation` into a single `useUpsertTaskVariantMutation`.
 *
 * @returns {UseMutationReturnType<void, Error, VariantUpdateInput, unknown>} The mutation object returned by `useMutation`.
 */
const useUpdateTaskVariantMutation = (): UseMutationReturnType<void, Error, VariantUpdateInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, VariantUpdateInput, unknown>({
    mutationKey: [TASK_VARIANT_UPDATE_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (variant: VariantUpdateInput): Promise<void> => {
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming updateTaskOrVariant returns Promise<void>
      await authStore.roarfirekit.updateTaskOrVariant(variant);
    },
    onSuccess: () => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useUpdateTaskVariantMutation; 