import { toValue, MaybeRef, Ref, computed } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { taskFetcher, fetchByTaskId } from '@/helpers/query/tasks';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';

// Define TaskData structure (or import if defined elsewhere)
interface TaskData {
  id: string;
  name: string;
  testData?: any;
  demoData?: any;
  registered?: boolean;
  [key: string]: any;
}

// Define QueryOptions structure (similar to useUserClaimsQuery)
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

/**
 * Tasks query.
 *
 * @param {MaybeRef<boolean>} [registeredTasksOnly=true] – Whether to fetch only registered tasks.
 * @param {MaybeRef<string[] | undefined>} [taskIds=undefined] – An optional array of task IDs to fetch.
 * @param {QueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<TaskData[], Error>} The TanStack query result.
 */
const useTasksQuery = (
  registeredTasksOnly: MaybeRef<boolean> = true,
  taskIds: MaybeRef<string[] | undefined> = undefined,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<TaskData[], Error> => {

  const queryKey = computed(() => {
    const ids = toValue(taskIds);
    if (!_isEmpty(ids)) {
      return [TASKS_QUERY_KEY, ids] as const;
    } else if (toValue(registeredTasksOnly)) {
      return [TASKS_QUERY_KEY, 'registered'] as const;
    } else {
      return [TASKS_QUERY_KEY] as const;
    }
  });

  const queryFn = async (): Promise<TaskData[]> => {
    const ids = toValue(taskIds);
    if (!_isEmpty(ids)) {
      if (ids === undefined) {
        console.warn('useTasksQuery: taskIds were considered non-empty but are undefined.');
        return [];
      }
      return fetchByTaskId(ids);
    } else {
      return taskFetcher(toValue(registeredTasksOnly), true);
    }
  };

  return useQuery<TaskData[], Error>({
    queryKey,
    queryFn,
    ...(queryOptions ?? {}),
  });
};

export default useTasksQuery; 