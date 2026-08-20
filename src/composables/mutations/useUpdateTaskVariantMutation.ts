import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { TASK_VARIANT_REGISTER_MUTATION_KEY } from '@/constants/mutationKeys';
import { TASK_VARIANT_REVISIONS_QUERY_KEY, TASK_VARIANTS_CATALOG_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { logger } from '@/logger';
import type { UpdateTaskVariantParams, UpdateTaskVariantResult } from '@/types/taskCatalog';

const useUpdateTaskVariantMutation = (): UseMutationReturnType<
  UpdateTaskVariantResult,
  Error,
  UpdateTaskVariantParams,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_VARIANT_REGISTER_MUTATION_KEY,
    mutationFn: (payload: UpdateTaskVariantParams) => tasksRepository.updateTaskVariant(payload),
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANTS_CATALOG_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_VARIANT_REVISIONS_QUERY_KEY, payload.id] });
      logger.capture('Task catalog: update task variant flags', {
        variantId: payload.id,
        registered: payload.registered,
        archived: payload.archived,
      });
    },
    onError: (error: Error, payload: UpdateTaskVariantParams): void => {
      logger.error(new Error('Failed to update Task Variant', { cause: error }), {
        tags: { function: 'useUpdateTaskVariantMutation', payload },
      });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useUpdateTaskVariantMutation;
