import { toValue, Ref } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import { variantsFetcher } from '@/helpers/query/tasks';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';

interface TaskVariant {
  id: string;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<TaskVariant[], Error>>;

/**
 * Tasks Variants query.
 *
 * @param {Ref<boolean> | boolean} [registeredVariantsOnly=false] – Whether to fetch only registered variants.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useTaskVariantsQuery = (
  registeredVariantsOnly: Ref<boolean> | boolean = false,
  queryOptions: QueryOptions | undefined = undefined
) => {
  const resolvedRegisteredVariantsOnly = toValue(registeredVariantsOnly);

  return useQuery<TaskVariant[], Error>({
    queryKey: resolvedRegisteredVariantsOnly
      ? [TASK_VARIANTS_QUERY_KEY, 'registered']
      : [TASK_VARIANTS_QUERY_KEY],
    queryFn: async () => {
      const variants = await variantsFetcher(resolvedRegisteredVariantsOnly);
      return variants as TaskVariant[];
    },
    ...queryOptions,
  });
};

export default useTaskVariantsQuery; 