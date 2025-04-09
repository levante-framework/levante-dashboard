import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure of the task variant data being updated
interface TaskVariantUpdateData {
  id: string; // Variant ID required for update
  taskId?: string; // May need parent taskId?
  // Include other updatable fields
  name?: string;
  [key: string]: any;
}

// Define context type
type UpdateTaskVariantContext = void;

/**
 * Update Task Variant mutation.
 *
 * TanStack mutation to update a task variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useAddTaskVariantMutation` into a single `useUpsertTaskVariantMutation`. Currently
 * difficult to achieve due to the underlaying firekit functions being different.
 *
 * @returns {UseMutationReturnType<void, Error, TaskVariantUpdateData, UpdateTaskVariantContext>} The mutation object returned by `useMutation`.
 */
const useUpdateTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantUpdateData, UpdateTaskVariantContext> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, TaskVariantUpdateData, UpdateTaskVariantContext>({
    mutationKey: [TASK_VARIANT_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (variant: TaskVariantUpdateData): Promise<void> => {
      // Ensure roarfirekit and method exist
      if (!authStore.roarfirekit?.updateTaskOrVariant) {
        throw new Error('Roarfirekit not initialized or updateTaskOrVariant method missing.');
      }
      // Assuming updateTaskOrVariant handles variants too
      await authStore.roarfirekit.updateTaskOrVariant(variant);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useUpdateTaskVariantMutation] Failed to update task variant:', error, 'Variant Data:', variables);
    },
  });
};

export default useUpdateTaskVariantMutation;
