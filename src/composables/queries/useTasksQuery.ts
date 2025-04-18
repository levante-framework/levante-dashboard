import { toValue, computed, type MaybeRef, type ComputedRef } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
// Import helpers and the TaskData interface from the TS file
import { taskFetcher, fetchByTaskId, type TaskData } from '@/helpers/query/tasks';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';

/**
 * Tasks query.
 *
 * Fetches tasks, optionally filtering by registration status or specific IDs.
 *
 * @param {MaybeRef<boolean>} [registeredTasksOnly=false] – Whether to fetch only registered tasks.
 * @param {MaybeRef<string[] | undefined>} [taskIds=undefined] – An optional array of task IDs to fetch. If provided, `registeredTasksOnly` is ignored.
 * @param {UseQueryOptions<TaskData[], Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<TaskData[], Error>} The TanStack query result.
 */
function useTasksQuery(
  registeredTasksOnly: MaybeRef<boolean> = false,
  taskIds: MaybeRef<string[] | undefined> = undefined,
  queryOptions?: UseQueryOptions<TaskData[], Error>
): UseQueryReturnType<TaskData[], Error> {

  const computedTaskIds = computed(() => toValue(taskIds));
  const computedRegisteredOnly = computed(() => toValue(registeredTasksOnly));

  const queryKey: ComputedRef<QueryKey> = computed(() => {
    const ids = computedTaskIds.value;
    const registered = computedRegisteredOnly.value;

    if (ids && ids.length > 0) {
      // Sort IDs for a stable key
      return [TASKS_QUERY_KEY, [...ids].sort()];
    } else if (registered) {
      return [TASKS_QUERY_KEY, 'registered'];
    } else {
      return [TASKS_QUERY_KEY];
    }
  });

  const queryFn = computed(() => {
    const ids = computedTaskIds.value;
    const registered = computedRegisteredOnly.value;

    if (ids && ids.length > 0) {
      // fetchByTaskId now expects string[] directly
      return () => fetchByTaskId(ids);
    } else {
      return () => taskFetcher(registered, true); // Passing allData = true like in the original JS
    }
  });

  return useQuery<TaskData[], Error>({
    queryKey,
    queryFn,
    ...queryOptions,
  });
}

export default useTasksQuery; 