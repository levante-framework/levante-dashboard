import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { TASK_UPSERT_MUTATION_KEY } from '@/constants/mutationKeys';
import { TASKS_CATALOG_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { logger } from '@/logger';
import type { UpsertTaskParams, UpsertTaskResult } from '@/types/taskCatalog';

const useUpsertTaskMutation = (): UseMutationReturnType<UpsertTaskResult, Error, UpsertTaskParams, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_UPSERT_MUTATION_KEY,
    mutationFn: (payload: UpsertTaskParams) => tasksRepository.upsertTask(payload),
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_CATALOG_QUERY_KEY] });
      logger.capture('Task catalog: upsert task', { taskId: payload.id, name: payload.name });
    },
    onError: (error: Error, payload: UpsertTaskParams): void => {
      logger.error(error, { payload });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useUpsertTaskMutation;
