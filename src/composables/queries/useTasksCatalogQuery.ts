import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { TASKS_CATALOG_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import type { SerializedTask } from '@/types/taskCatalog';

type TasksCatalogQueryOptions = Omit<UseQueryOptions<SerializedTask[]>, 'queryKey' | 'queryFn'>;

const useTasksCatalogQuery = (
  options?: { enabled?: MaybeRefOrGetter<boolean> } & TasksCatalogQueryOptions,
): UseQueryReturnType<SerializedTask[], Error> => {
  const { enabled, ...queryOptions } = options ?? {};
  const isEnabled = computed(() => (enabled === undefined ? true : Boolean(toValue(enabled))));

  return useQuery({
    queryKey: [TASKS_CATALOG_QUERY_KEY],
    queryFn: () => tasksRepository.getTasks(),
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useTasksCatalogQuery;
