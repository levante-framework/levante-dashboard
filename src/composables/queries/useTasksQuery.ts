import { toValue, type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { taskFetcher, fetchByTaskId } from '@/helpers/query/tasks';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';

// Re-define TaskData interface (or import if defined elsewhere)
interface TaskData {
  id: string;
  name?: string;
  [key: string]: any;
}

// Re-define query options type
type TasksQueryOptions = Omit<
  UseQueryOptions<TaskData[], Error, TaskData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn'
>;

/**
 * Tasks query.
 *
 * @param {MaybeRef<boolean>} [registeredTasksOnly=false] – Whether to fetch only registered tasks.
 * @param {MaybeRef<string[] | undefined>} [taskIds=undefined] – An optional array of task IDs to fetch.
 * @param {TasksQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<TaskData[], Error>} The TanStack query result.
 */
const useTasksQuery = (
  registeredTasksOnly: MaybeRef<boolean> = false,
  taskIds: MaybeRef<string[] | undefined> = undefined,
  queryOptions: TasksQueryOptions = {},
): UseQueryReturnType<TaskData[], Error> => {
  // Determine query key
  const currentTaskIdsValue = unref(taskIds);
  const isRegisteredOnlyValue = unref(registeredTasksOnly);

  const queryKey: ReadonlyArray<unknown> = isRegisteredOnlyValue
    ? [TASKS_QUERY_KEY, 'registered']
    : !_isEmpty(currentTaskIdsValue)
    ? [TASKS_QUERY_KEY, taskIds] // Use MaybeRef in key
    : [TASKS_QUERY_KEY];

  // Determine query function
  const queryFn = async (): Promise<TaskData[]> => {
    const currentIds = unref(taskIds);
    const isRegistered = unref(registeredTasksOnly);
    let result: any[]; // Use any initially

    if (!_isEmpty(currentIds)) {
      // Check necessary because currentIds could be undefined
      if (currentIds) {
        result = await fetchByTaskId(currentIds);
      } else {
        result = [];
      }
    } else {
      result = await taskFetcher(isRegistered, true);
    }
    return result as TaskData[]; // Cast final result
  };

  return useQuery<TaskData[], Error, TaskData[], ReadonlyArray<unknown>>({
    queryKey: queryKey,
    queryFn: queryFn,
    ...queryOptions, // Spread the rest of the options
  });
};

export default useTasksQuery;
