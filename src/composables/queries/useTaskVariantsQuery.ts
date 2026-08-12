import { useQuery } from '@tanstack/vue-query';
import { toValue } from 'vue';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';
import { variantsFetcher } from '@/helpers/query/tasks';

/**
 * Tasks Variants query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useTaskVariantsQuery = (registeredVariantsOnly = false, queryOptions?: UseQueryOptions): UseQueryReturnType => {
  const queryKey = toValue(registeredVariantsOnly)
    ? [TASK_VARIANTS_QUERY_KEY, 'registered']
    : [TASK_VARIANTS_QUERY_KEY];

  return useQuery({
    queryKey,
    queryFn: () => variantsFetcher(registeredVariantsOnly),
    ...queryOptions,
  });
};

export default useTaskVariantsQuery;
