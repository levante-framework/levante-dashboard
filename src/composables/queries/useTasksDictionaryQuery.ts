import { computed, ComputedRef, MaybeRef } from 'vue';
import { UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
// Remove @ts-ignore and update import to use the .ts file
import useTasksQuery from './useTasksQuery'; // Removed .js extension
// Import the TaskData interface from the helper
import type { TaskData } from '@/helpers/query/tasks';

// Use TaskData interface
interface Task extends TaskData {}

interface TaskDictionary {
  [key: string]: Task;
}

type UseTasksDictionaryQueryReturnType = Omit<UseQueryReturnType<Task[], Error>, 'data'> & {
  data: ComputedRef<Task[] | undefined>;
  tasksDictionary: ComputedRef<TaskDictionary>;
};

/**
 * Fetches tasks using useTasksQuery and computes a dictionary for quick access by ID.
 *
 * @param {MaybeRef<boolean>} [registeredTasksOnly=false] – Whether to fetch only registered tasks.
 * @param {MaybeRef<string[]> | undefined} [taskIds=undefined] – An optional array of task IDs to fetch.
 * @param {UseQueryOptions<Task[], Error, Task[], any>} [queryOptions] – Optional TanStack query options.
 * @returns {UseTasksDictionaryQueryReturnType} The TanStack query result with an added computed tasksDictionary.
 */
function useTasksDictionaryQuery(
  registeredTasksOnly: MaybeRef<boolean> = false,
  taskIds: MaybeRef<string[]> | undefined = undefined,
  queryOptions?: UseQueryOptions<Task[], Error, Task[], any>,
): UseTasksDictionaryQueryReturnType {
  const tasksQuery = useTasksQuery(registeredTasksOnly, taskIds, queryOptions) as UseQueryReturnType<Task[], Error>;

  const tasksDictionary = computed<TaskDictionary>(() => {
    const tasks = tasksQuery.data?.value; // Access .value for Ref data
    if (!tasks) {
      return {};
    }
    return tasks.reduce<TaskDictionary>((acc: TaskDictionary, task: Task) => {
      acc[task.id] = task;
      return acc;
    }, {});
  });

  return {
    ...tasksQuery,
    data: computed(() => tasksQuery.data?.value),
    tasksDictionary,
  };
}

export default useTasksDictionaryQuery; 