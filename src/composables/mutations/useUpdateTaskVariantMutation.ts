import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { TASKS_QUERY_KEY, TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_VARIANT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import type { TaskVariantPayload } from '@/types/task';

const useUpdateTaskVariantMutation = (): UseMutationReturnType<void, Error, TaskVariantPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_VARIANT_UPDATE_MUTATION_KEY,
    mutationFn: async (variant: TaskVariantPayload): Promise<void> => {
      console.log('mark://variantmutation', variant);
      await tasksRepository.upsertTaskVariant(variant);
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_QUERY_KEY] });
    },
  });
};

export default useUpdateTaskVariantMutation;
