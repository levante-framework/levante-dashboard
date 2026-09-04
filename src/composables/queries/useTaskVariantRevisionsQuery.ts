import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { TASK_VARIANT_REVISIONS_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import type { SerializedTaskVariantRevision } from '@/types/taskCatalog';

type TaskVariantRevisionsQueryOptions = Omit<UseQueryOptions<SerializedTaskVariantRevision[]>, 'queryKey' | 'queryFn'>;

interface UseTaskVariantRevisionsQueryParams {
  variantId?: MaybeRefOrGetter<string | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}

const useTaskVariantRevisionsQuery = (
  params: UseTaskVariantRevisionsQueryParams = {},
  queryOptions?: TaskVariantRevisionsQueryOptions,
): UseQueryReturnType<SerializedTaskVariantRevision[], Error> => {
  const variantId = computed(() => toValue(params.variantId) || undefined);
  const isEnabled = computed(() => {
    if (!variantId.value) return false;
    return params.enabled === undefined ? true : Boolean(toValue(params.enabled));
  });

  return useQuery({
    queryKey: computed(() => [TASK_VARIANT_REVISIONS_QUERY_KEY, variantId.value ?? null]),
    queryFn: () => tasksRepository.getTaskVariantRevisions(variantId.value!),
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useTaskVariantRevisionsQuery;
