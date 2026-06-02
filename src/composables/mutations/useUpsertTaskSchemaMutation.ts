import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASK_SCHEMAS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_SCHEMA_UPSERT_MUTATION_KEY } from '@/constants/mutationKeys';
import { taskSchemaFunctionsClient } from '@/services/TaskSchemaFunctionsClient';
import type { ParamDefinitions } from '@/types/taskSchema';

interface UpsertTaskSchemaPayload {
  taskId: string;
  paramDefinitions: ParamDefinitions;
}

interface UpsertTaskSchemaMutationResult {
  version: number;
  createdAt?: unknown;
}

const useUpsertTaskSchemaMutation = (): UseMutationReturnType<
  UpsertTaskSchemaMutationResult | undefined,
  Error,
  UpsertTaskSchemaPayload,
  unknown
> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_SCHEMA_UPSERT_MUTATION_KEY,
    mutationFn: async (payload: UpsertTaskSchemaPayload) => {
      const siteId = authStore.currentSite;
      if (!siteId) throw new Error('Current site is required to upsert task schema');
      const result = await taskSchemaFunctionsClient.upsertTaskSchema({
        ...payload,
        siteId,
      });
      return result
        ? { version: result.version, createdAt: result.taskSchema?.createdAt }
        : undefined;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASK_SCHEMAS_QUERY_KEY] });
    },
  });
};

export default useUpsertTaskSchemaMutation;
