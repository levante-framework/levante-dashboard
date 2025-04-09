import { toValue, type MaybeRef, unref, computed } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { variantsFetcher } from '@/helpers/query/tasks';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';

// Placeholder type for task variant data
interface TaskVariantData {
  id: string;
  name?: string;
  taskId?: string;
  [key: string]: any;
}

// Define specific query options type
type TaskVariantsQueryOptions = Omit<
  UseQueryOptions<TaskVariantData[], Error, TaskVariantData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn'
>;

/**
 * Tasks Variants query.
 *
 * @param {MaybeRef<boolean>} [registeredVariantsOnly=false] – Whether to fetch only registered variants.
 * @param {TaskVariantsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<TaskVariantData[], Error>} The TanStack query result.
 */
const useTaskVariantsQuery = (
  registeredVariantsOnly: MaybeRef<boolean> = false,
  queryOptions: TaskVariantsQueryOptions = {},
): UseQueryReturnType<TaskVariantData[], Error> => {
  // Determine query key based on parameter, using computed for reactivity
  const queryKey = computed(() =>
    unref(registeredVariantsOnly)
      ? [TASK_VARIANTS_QUERY_KEY, 'registered']
      : [TASK_VARIANTS_QUERY_KEY]
  );

  return useQuery<TaskVariantData[], Error, TaskVariantData[], ReadonlyArray<unknown>>({
    // Pass computed ref for reactive query key
    queryKey: queryKey,
    queryFn: async (): Promise<TaskVariantData[]> => {
      // Ensure variantsFetcher returns the correct type or cast
      const result = await variantsFetcher(unref(registeredVariantsOnly));
      return result as TaskVariantData[];
    },
    ...queryOptions, // Spread options here
  });
};

export default useTaskVariantsQuery;
