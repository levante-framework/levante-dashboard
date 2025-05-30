import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

interface TaskData {
  [key: string]: any;
}

/**
 * Add Task mutation.
 *
 * TanStack mutation to add a task and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 * @TODO: Consider merging this with `useUpdateTaskMutation` into a single `useUpsertTaskMutation`. Currently difficult
 * to achieve due to the underlaying firekit functions being different.
 *
 * @returns The mutation object returned by `useMutation`.
 */

const useAddTaskMutation = (): UseMutationReturnType<void, Error, TaskData, unknown> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_ADD_MUTATION_KEY,
    mutationFn: async (task: TaskData): Promise<void> => {
      await authStore.roarfirekit.registerTaskVariant({ ...task });
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
};

export default useAddTaskMutation;
