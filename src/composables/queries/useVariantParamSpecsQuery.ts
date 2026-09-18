import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { VARIANT_PARAM_SPECS_QUERY_KEY } from '@/constants/queryKeys';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import type { SerializedVariantParamSpec } from '@/types/taskCatalog';

type VariantParamSpecsQueryOptions = Omit<UseQueryOptions<SerializedVariantParamSpec[]>, 'queryKey' | 'queryFn'>;

const useVariantParamSpecsQuery = (
  options?: { enabled?: MaybeRefOrGetter<boolean> } & VariantParamSpecsQueryOptions,
): UseQueryReturnType<SerializedVariantParamSpec[], Error> => {
  const { enabled, ...queryOptions } = options ?? {};
  const isEnabled = computed(() => (enabled === undefined ? true : Boolean(toValue(enabled))));

  return useQuery({
    queryKey: [VARIANT_PARAM_SPECS_QUERY_KEY],
    queryFn: () => tasksRepository.getVariantParamSpecs(),
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useVariantParamSpecsQuery;
