import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

interface TaskVariantData {
  [key: string]: any;
}

/**
 * Update Task Variant mutation.
 *
 * TanStack mutation to update a task variant and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useAddTaskVariantMutation` into a single `useUpsertTaskVariantMutation`. Currently
 * difficult to achieve due to the underlaying firekit functions being different.
 *
 * @returns The mutation object returned by `useMutation`.
 */

const useUpdateTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantData, unknown> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_VARIANT_UPDATE_MUTATION_KEY,
    mutationFn: async (variant: TaskVariantData): Promise<void> => {
      await authStore.roarfirekit.updateTaskOrVariant(variant);
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
  });
};

export default useUpdateTaskVariantMutation;
