import { toValue, Ref } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { taskFetcher, fetchByTaskId } from '@/helpers/query/tasks';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';

interface Task {
  id: string;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<Task[], Error>>;

type TaskIds = string[] | undefined;

/**
 * Tasks query.
 *
 * @param {Ref<boolean> | boolean} [registeredTasksOnly=false] – Whether to fetch only registered tasks.
 * @param {Ref<TaskIds> | TaskIds} [taskIds=undefined] – An optional array of task IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useTasksQuery = (
  registeredTasksOnly: Ref<boolean> | boolean = false,
  taskIds: Ref<TaskIds> | TaskIds = undefined,
  queryOptions: QueryOptions | undefined = undefined
) => {
  const resolvedTaskIds = toValue(taskIds);
  const resolvedRegisteredTasksOnly = toValue(registeredTasksOnly);

  const queryFn = !_isEmpty(resolvedTaskIds)
    ? async () => {
        const tasks = await fetchByTaskId(resolvedTaskIds as string[]);
        return tasks as Task[];
      }
    : async () => {
        const tasks = await taskFetcher(resolvedRegisteredTasksOnly, true);
        return tasks as Task[];
      };

  return useQuery<Task[], Error>({
    queryKey: resolvedRegisteredTasksOnly
      ? [TASKS_QUERY_KEY, 'registered']
      : !_isEmpty(resolvedTaskIds)
      ? [TASKS_QUERY_KEY, resolvedTaskIds]
      : [TASKS_QUERY_KEY],
    queryFn,
    ...queryOptions,
  });
};

export default useTasksQuery; 