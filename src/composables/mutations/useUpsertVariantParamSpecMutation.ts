import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { VARIANT_PARAM_SPEC_UPSERT_MUTATION_KEY } from '@/constants/mutationKeys';
import { VARIANT_PARAM_SPECS_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { logger } from '@/logger';
import type { UpsertVariantParamSpecParams, UpsertVariantParamSpecResult } from '@/types/taskCatalog';

const useUpsertVariantParamSpecMutation = (): UseMutationReturnType<
  UpsertVariantParamSpecResult,
  Error,
  UpsertVariantParamSpecParams,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: VARIANT_PARAM_SPEC_UPSERT_MUTATION_KEY,
    mutationFn: (payload: UpsertVariantParamSpecParams) => tasksRepository.upsertVariantParamSpec(payload),
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [VARIANT_PARAM_SPECS_QUERY_KEY] });
      logger.capture('Task catalog: upsert variant param spec', { id: payload.id, name: payload.name });
    },
    onError: (error: Error, payload: UpsertVariantParamSpecParams): void => {
      logger.error(error, { payload });
    },
  });
};

export default useUpsertVariantParamSpecMutation;
