import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure for the variant data payload
interface VariantData {
    name?: string;
    params?: Record<string, any>;
    demoData?: boolean;
    testData?: boolean;
    registered?: boolean;
    [key: string]: any; // Allow other properties
}

// Define the structure for the mutation variables
interface NewVariantPayload {
    taskId: string;
    data: VariantData;
}

/**
 * Add Task Variant mutation.
 *
 * TanStack mutation to add a task variant and automatically invalidate the corresponding queries.
 * @returns The mutation object returned by `useMutation`.
 */
const useAddTaskVariantMutation = (): UseMutationReturnType<void, Error, NewVariantPayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, NewVariantPayload, unknown>({
    mutationKey: [TASK_VARIANT_ADD_MUTATION_KEY], // Wrap key in array
    mutationFn: async (variantPayload: NewVariantPayload): Promise<void> => {
        if (!authStore.isFirekitInit || !authStore.roarfirekit) {
            throw new Error('Roarfirekit is not initialized. Cannot add task variant.');
        }
        // Assuming registerTaskVariant handles this payload structure
        await authStore.roarfirekit.registerTaskVariant(variantPayload);
    },
    onSuccess: () => {
      // Invalidate both tasks and variants queries
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
    onError: (error: Error, variables: NewVariantPayload) => {
        console.error(`Error adding task variant for task ID ${variables.taskId}:`, error);
    }
    // Consider adding retry logic if appropriate
  });
};

export default useAddTaskVariantMutation; 