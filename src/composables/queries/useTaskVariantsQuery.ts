import { toValue, computed, type Ref, type ComputedRef, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
// @ts-ignore - tasks.ts uses ignored utils
import { variantsFetcher, type VariantWithTask } from '@/helpers/query/tasks';
import { TASK_VARIANTS_QUERY_KEY } from '@/constants/queryKeys';

/**
 * Tasks Variants query.
 *
 * Fetches task variants, optionally filtering for registered ones.
 *
 * @param registeredVariantsOnly - Ref<boolean> indicating whether to fetch only registered variants.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useTaskVariantsQuery = (
    registeredVariantsOnly: Ref<boolean> = ref(false), // Use imported ref
    queryOptions?: QueryOptions<VariantWithTask[], Error>
): UseQueryReturnType<VariantWithTask[], Error> => {

  const queryKey: ComputedRef<QueryKey> = computed(() =>
    toValue(registeredVariantsOnly)
      ? [TASK_VARIANTS_QUERY_KEY, 'registered']
      : [TASK_VARIANTS_QUERY_KEY]
  );

  return useQuery<VariantWithTask[], Error>({
    queryKey,
    // Pass the unwrapped boolean value to the fetcher
    queryFn: () => variantsFetcher(toValue(registeredVariantsOnly)),
    // Cast spread options to any to bypass type checking issues
    ...(queryOptions as any),
  });
};

export default useTaskVariantsQuery; 