import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { pickLatestSchema, tasksRepository } from '@/firebase/repositories/TasksRepository';
import { TASK_SCHEMAS_QUERY_KEY } from '@/constants/queryKeys';

interface UseTaskSchemasQueryOptions {
  enabled?: MaybeRefOrGetter<boolean>;
}

const useTaskSchemasQuery = (taskId: MaybeRefOrGetter<string | null>, options?: UseTaskSchemasQueryOptions) => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  const queryKey = computed(() => [TASK_SCHEMAS_QUERY_KEY, toValue(taskId), currentSite.value] as const);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const all = await tasksRepository.getTaskSchemaVersions(toValue(taskId)!, currentSite.value!);
      return {
        latest: pickLatestSchema(all),
        all,
      };
    },
    enabled: () =>
      !!toValue(taskId) && !!currentSite.value && (enabledOption == null ? true : toValue(enabledOption)),
    ...restOptions,
  });

  return {
    ...query,
    schema: computed(() => query.data.value?.latest ?? null),
    schemas: computed(() => query.data.value?.all ?? []),
  };
};

export default useTaskSchemasQuery;
