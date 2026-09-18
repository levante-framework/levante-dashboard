import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { TASK_VARIANT_CREATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { TASK_VARIANTS_CATALOG_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { logger } from '@/logger';
import type { CreateTaskVariantParams, CreateTaskVariantResult } from '@/types/taskCatalog';

const useCreateTaskVariantMutation = (): UseMutationReturnType<
  CreateTaskVariantResult,
  Error,
  CreateTaskVariantParams,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_VARIANT_CREATE_MUTATION_KEY,
    mutationFn: (payload: CreateTaskVariantParams) => tasksRepository.createTaskVariant(payload),
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_CATALOG_QUERY_KEY] });
      logger.capture('Task catalog: create task variant', {
        taskId: payload.taskId,
        name: payload.name,
        displayName: payload.displayName,
      });
    },
    onError: (error: Error, payload: CreateTaskVariantParams): void => {
      logger.error(error, { payload });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useCreateTaskVariantMutation;
