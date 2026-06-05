import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

interface TaskVariantData {
  taskId: string;
  variantName: string;
  variantParams: Record<string, unknown>;
  siteId: string;
  schemaVersion?: number;
  [key: string]: unknown;
}

const useAddTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantData, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_VARIANT_ADD_MUTATION_KEY,
    mutationFn: async (variant: TaskVariantData): Promise<void> => {
      const data = {
        taskId: variant.taskId,
        name: variant.variantName,
        params: variant.variantParams,
        registered: true,
        siteId: variant.siteId,
        ...(variant.schemaVersion != null && { schemaVersion: variant.schemaVersion }),
      };
      await tasksRepository.upsertTaskVariant(data);
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
  });
};

export default useAddTaskVariantMutation;
