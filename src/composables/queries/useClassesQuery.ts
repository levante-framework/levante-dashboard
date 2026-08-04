import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import type { Ref } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { CLASSES_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides, type QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';

/**
 * Classes query.
 *
 * @param classIds – A Vue ref containing an array of class IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useClassesQuery = (
  classIds: Ref<Array<string>>,
  queryOptions?: QueryOptionsWithEnabled,
): UseQueryReturnType<any, Error> => {
  // Ensure all necessary data is loaded before enabling the query.
  const conditions = [() => hasArrayEntries(classIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [CLASSES_QUERY_KEY, classIds],
    queryFn: async () => await fetchDocumentsById(FIRESTORE_COLLECTIONS.CLASSES, classIds.value),
    enabled: isQueryEnabled,
    meta: {
      errorMessage: 'Failed to fetch classes by ID',
      errorContext: {
        tags: { composable: 'useClassesQuery' },
        classIds: classIds.value,
      },
    },
    ...options,
  });
};

export default useClassesQuery;
