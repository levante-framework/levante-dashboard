import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { TASK_VARIANT_ADD_MUTATION_KEY } from '@/constants/mutationKeys';
import { TASK_VARIANTS_QUERY_KEY, TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';

interface TaskVariantData {
  [key: string]: any;
}

/**
 * Add Task Variant mutation.
 *
 * TanStack mutation to add a task variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useUpdateTaskVariantMutation` into a single `useUpsertTaskVariantMutation`.
 * Currently difficult to achieve due to the underlaying firekit functions being different.
 *
 * @returns The mutation object returned by `useMutation`.
 */

const useAddTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantData, unknown> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_VARIANT_ADD_MUTATION_KEY,
    mutationFn: async (variant: TaskVariantData): Promise<void> => {
      await authStore.roarfirekit.registerTaskVariant({ ...variant });
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
  });
};

export default useAddTaskVariantMutation;
