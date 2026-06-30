import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import _isEmpty from 'lodash/isEmpty';
import { useAuthStore } from '@/store/auth';
import { taskFetcher, fetchByTaskId } from '@/helpers/query/tasks';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';

/**
 * Tasks query.
 *
 * @param {ref<Boolean>} [registeredTasksOnly=false] – Whether to fetch only registered tasks.
 * @param {ref<Array<String>>|undefined} [taskIds=undefined] – An optional array of task IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useTasksQuery = (
  registeredTasksOnly = false,
  taskIds = undefined,
  queryOptions?: UseQueryOptions,
): UseQueryReturnType => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const { enabled: enabledOption, ...restOptions } = queryOptions ?? {};

  const queryKey = computed(() => {
    if (toValue(registeredTasksOnly)) {
      return [TASKS_QUERY_KEY, 'registered', currentSite.value] as const;
    }
    if (!_isEmpty(taskIds)) {
      return [TASKS_QUERY_KEY, toValue(taskIds), currentSite.value] as const;
    }
    return [TASKS_QUERY_KEY, currentSite.value] as const;
  });

  return useQuery({
    queryKey,
    queryFn: () => {
      const siteId = currentSite.value;
      if (!siteId) throw new Error('Current site is required to fetch tasks');
      return !_isEmpty(taskIds) ? fetchByTaskId(taskIds, siteId) : taskFetcher(registeredTasksOnly, siteId);
    },
    ...restOptions,
    enabled: () => !!currentSite.value && (enabledOption == null ? true : toValue(enabledOption)),
  });
};

export default useTasksQuery;
