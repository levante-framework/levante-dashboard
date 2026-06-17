import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';

interface UseTaskVariantsQueryOptions {
  enabled?: MaybeRefOrGetter<boolean>;
}

/**
 * Tasks Variants query.
 *
 * @param registeredVariantsOnly – When true, only registered variants are returned.
 * @param queryOptions – Optional TanStack query options.
 */
const useTaskVariantsQuery = (
  registeredVariantsOnly: MaybeRefOrGetter<boolean> = false,
  queryOptions?: UseTaskVariantsQueryOptions,
) => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const { enabled: enabledOption, ...restOptions } = queryOptions ?? {};

  const queryKey = computed(() => {
    if (toValue(registeredVariantsOnly)) {
      return [TASK_VARIANTS_QUERY_KEY, 'registered', currentSite.value] as const;
    }
    return [TASK_VARIANTS_QUERY_KEY, currentSite.value] as const;
  });

  return useQuery({
    queryKey,
    queryFn: () => {
      const siteId = currentSite.value;
      if (!siteId) throw new Error('Current site is required to fetch variants');
      return tasksRepository.getVariants({
        siteId,
        registeredVariantsOnly: toValue(registeredVariantsOnly),
      });
    },
    ...restOptions,
    enabled: () => !!currentSite.value && (enabledOption == null ? true : toValue(enabledOption)),
  });
};

export default useTaskVariantsQuery;
