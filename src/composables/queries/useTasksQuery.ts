import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { type MaybeRefOrGetter, toValue } from 'vue';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { type QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchByTaskId, taskFetcher } from '@/helpers/query/tasks';

/**
 * Tasks query.
 *
 * @param registeredTasksOnly – Whether to fetch only registered tasks.
 * @param taskIds – An optional array of task IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useTasksQuery = (
  registeredTasksOnly: MaybeRefOrGetter<boolean> = false,
  taskIds: MaybeRefOrGetter<string[] | null | undefined> = undefined,
  queryOptions?: QueryOptionsWithEnabled,
): UseQueryReturnType<any, Error> => {
  const hasTaskIds = !_isEmpty(toValue(taskIds));

  const queryKey = toValue(registeredTasksOnly)
    ? [TASKS_QUERY_KEY, 'registered']
    : hasTaskIds
      ? [TASKS_QUERY_KEY, taskIds]
      : [TASKS_QUERY_KEY];

  const queryFn = hasTaskIds
    ? () => fetchByTaskId(toValue(taskIds) ?? [])
    : () => taskFetcher(toValue(registeredTasksOnly), true);

  return useQuery({
    queryKey,
    queryFn,
    meta: {
      errorMessage: 'Failed to fetch tasks',
      errorContext: {
        tags: { composable: 'useTasksQuery' },
        taskIds: toValue(taskIds),
      },
    },
    ...queryOptions,
  });
};

export default useTasksQuery;
