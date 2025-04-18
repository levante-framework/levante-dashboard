import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure for the variant update data
// Based on variantUpdatePayload in src/components/tasks/ManageVariants.vue
interface VariantUpdateData {
    name?: string;
    params?: Record<string, any>;
    demoData?: boolean;
    testData?: boolean;
    registered?: boolean;
    [key: string]: any; // Allow other potential fields being updated
}

// Define the structure for the mutation variables
interface UpdateVariantPayload {
    taskId: string;
    variantId: string;
    data: VariantUpdateData;
}

/**
 * Update Task Variant mutation.
 *
 * TanStack mutation to update a task variant and automatically invalidate the corresponding queries.
 * @returns The mutation object returned by `useMutation`.
 */
const useUpdateTaskVariantMutation = (): UseMutationReturnType<void, Error, UpdateVariantPayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, UpdateVariantPayload, unknown>({
    mutationKey: [TASK_VARIANT_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (variantPayload: UpdateVariantPayload): Promise<void> => {
        if (!authStore.isFirekitInit || !authStore.roarfirekit) {
            throw new Error('Roarfirekit is not initialized. Cannot update task variant.');
        }
        // Assuming updateTaskOrVariant handles this specific payload structure for variants
      await authStore.roarfirekit.updateTaskOrVariant(variantPayload);
    },
    onSuccess: () => {
      // Invalidate both tasks and variants queries upon successful update
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
    onError: (error: Error, variables: UpdateVariantPayload) => {
        console.error(`Error updating variant ID ${variables.variantId} for task ID ${variables.taskId}:`, error);
    }
    // Consider adding retry logic
  });
};

export default useUpdateTaskVariantMutation; 