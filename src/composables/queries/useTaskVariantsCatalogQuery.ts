import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { TASK_VARIANTS_CATALOG_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { sortVariantsByCreatedAt } from '@/helpers/diffVariantParams';
import type { GetTaskVariantsParams, SerializedTaskVariant } from '@/types/taskCatalog';

type TaskVariantsCatalogQueryOptions = Omit<UseQueryOptions<SerializedTaskVariant[]>, 'queryKey' | 'queryFn'>;

interface UseTaskVariantsCatalogQueryParams {
  taskId?: MaybeRefOrGetter<string | undefined>;
  registered?: MaybeRefOrGetter<boolean | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}

const useTaskVariantsCatalogQuery = (
  params: UseTaskVariantsCatalogQueryParams = {},
  queryOptions?: TaskVariantsCatalogQueryOptions,
): UseQueryReturnType<SerializedTaskVariant[], Error> => {
  const taskId = computed(() => toValue(params.taskId) || undefined);
  const registered = computed(() => toValue(params.registered));
  const isEnabled = computed(() => (params.enabled === undefined ? true : Boolean(toValue(params.enabled))));

  return useQuery({
    queryKey: computed(() => [TASK_VARIANTS_CATALOG_QUERY_KEY, taskId.value ?? null, registered.value ?? null]),
    queryFn: async () => {
      const request: GetTaskVariantsParams = {};
      if (taskId.value) request.taskId = taskId.value;
      if (registered.value !== undefined) request.registered = registered.value;
      const variants = await tasksRepository.getTaskVariants(request);
      return sortVariantsByCreatedAt(variants, true);
    },
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useTaskVariantsCatalogQuery;
