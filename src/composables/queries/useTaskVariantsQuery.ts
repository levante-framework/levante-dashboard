import { toValue, MaybeRef, computed } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { variantsFetcher } from '@/helpers/query/tasks';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';

// Define TaskData structure (if not imported)
interface TaskData {
  id: string;
  name: string;
  [key: string]: any;
}

// Define VariantData structure (matching return of variantsFetcher)
interface VariantData {
  id: string;
  variant: any; // Replace 'any' with more specific type if known
  task: TaskData;
  [key: string]: any;
}

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

/**
 * Tasks Variants query.
 *
 * @param {MaybeRef<boolean>} [registeredVariantsOnly=false] – Whether to fetch only registered variants.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<VariantData[], Error>} The TanStack query result.
 */
const useTaskVariantsQuery = (
  registeredVariantsOnly: MaybeRef<boolean> = false,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<VariantData[], Error> => {

  const queryKey = computed(() =>
    toValue(registeredVariantsOnly)
      ? [TASK_VARIANTS_QUERY_KEY, 'registered'] as const
      : [TASK_VARIANTS_QUERY_KEY] as const
  );

  // Define queryFn with explicit return type
  const queryFn = (): Promise<VariantData[]> => variantsFetcher(toValue(registeredVariantsOnly));

  return useQuery<VariantData[], Error>({
    queryKey,
    queryFn,
    ...(queryOptions ?? {}),
  });
};

export default useTaskVariantsQuery; 