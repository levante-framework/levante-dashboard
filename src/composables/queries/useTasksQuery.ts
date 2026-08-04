import { useQuery } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { toValue } from 'vue';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchByTaskId, taskFetcher } from '@/helpers/query/tasks';

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
  const queryKey = toValue(registeredTasksOnly)
    ? [TASKS_QUERY_KEY, 'registered']
    : !_isEmpty(taskIds)
      ? [TASKS_QUERY_KEY, taskIds]
      : [TASKS_QUERY_KEY];

  const queryFn = !_isEmpty(taskIds) ? () => fetchByTaskId(taskIds) : () => taskFetcher(registeredTasksOnly, true);

  return useQuery({
    meta: { composable: 'useTasksQuery' },
    queryKey,
    queryFn,
    ...queryOptions,
  });
};

export default useTasksQuery;
