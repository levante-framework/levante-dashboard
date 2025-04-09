import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure of the task variant being added
// This should match parameters for roarfirekit.registerTaskVariant
interface TaskVariantInputData {
  id?: string;
  taskId: string; // Variant likely needs parent task ID
  name?: string;
  // Add other required/optional variant properties
  [key: string]: any;
}

// Define the type for the mutation function context
type AddTaskVariantMutationContext = void;

/**
 * Add Task Variant mutation.
 *
 * TanStack mutation to add a task variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useUpdateTaskVariantMutation` into a single `useUpsertTaskVariantMutation`.
 * Currently difficult to achieve due to the underlaying firekit functions being different.
 *
 * @returns {UseMutationReturnType<void, Error, TaskVariantInputData, AddTaskVariantMutationContext>} The mutation object returned by `useMutation`.
 */
const useAddTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantInputData, AddTaskVariantMutationContext> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, TaskVariantInputData, AddTaskVariantMutationContext>({
    mutationKey: [TASK_VARIANT_ADD_MUTATION_KEY], // Wrap key in array
    mutationFn: async (variant: TaskVariantInputData): Promise<void> => {
      // Ensure roarfirekit and the method exist
      if (!authStore.roarfirekit?.registerTaskVariant) {
        throw new Error('Roarfirekit not initialized or registerTaskVariant method missing.');
      }
      // Assuming registerTaskVariant adds/updates variants
      await authStore.roarfirekit.registerTaskVariant({ ...variant });
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useAddTaskVariantMutation] Failed to add task variant:', error, 'Variables:', variables);
    },
  });
};

export default useAddTaskVariantMutation;
