import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { VARIANT_SUMMARIES_QUERY_KEY } from '@/constants/queryKeys';

interface UseVariantSummariesQueryOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  taskId?: MaybeRefOrGetter<string | null | undefined>;
}

const useVariantSummariesQuery = (
  registeredVariantsOnly: MaybeRefOrGetter<boolean> = false,
  queryOptions?: UseVariantSummariesQueryOptions,
) => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const { enabled: enabledOption, taskId: taskIdOption, ...restOptions } = queryOptions ?? {};

  const queryKey = computed(() => {
    const taskId = toValue(taskIdOption);
    if (toValue(registeredVariantsOnly)) {
      return [VARIANT_SUMMARIES_QUERY_KEY, 'registered', taskId ?? 'all', currentSite.value] as const;
    }
    return [VARIANT_SUMMARIES_QUERY_KEY, taskId ?? 'all', currentSite.value] as const;
  });

  return useQuery({
    queryKey,
    queryFn: () => {
      const siteId = currentSite.value;
      if (!siteId) throw new Error('Current site is required to fetch variant summaries');
      const taskId = toValue(taskIdOption);
      return tasksRepository.getVariantSummaries({
        siteId,
        ...(taskId ? { taskId } : {}),
        registeredVariantsOnly: toValue(registeredVariantsOnly),
      });
    },
    ...restOptions,
    enabled: () => !!currentSite.value && (enabledOption == null ? true : toValue(enabledOption)),
  });
};

export default useVariantSummariesQuery;
