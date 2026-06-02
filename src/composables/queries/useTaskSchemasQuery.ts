import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { taskSchemaFunctionsClient } from '@/services/TaskSchemaFunctionsClient';
import { TASK_SCHEMAS_QUERY_KEY } from '@/constants/queryKeys';
import type { TaskSchemaResultItem } from '@/types/taskSchema';

interface UseTaskSchemasQueryOptions {
  enabled?: MaybeRefOrGetter<boolean>;
}

const useTaskSchemasQuery = (
  taskId: MaybeRefOrGetter<string | null>,
  options?: UseTaskSchemasQueryOptions,
) => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  const queryKey = computed(() => [TASK_SCHEMAS_QUERY_KEY, toValue(taskId), currentSite.value] as const);
  const query = useQuery({
    queryKey,
    queryFn: () => taskSchemaFunctionsClient.getTaskSchemas(toValue(taskId)!, currentSite.value!),
    enabled: () =>
      !!toValue(taskId) &&
      !!currentSite.value &&
      (enabledOption == null ? true : toValue(enabledOption)),
    ...restOptions,
  });

  return {
    ...query,
    schema: query.data,
  };
};

export default useTaskSchemasQuery;
