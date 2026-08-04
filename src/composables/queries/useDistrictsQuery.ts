import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import type { Ref } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { DISTRICTS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides, type QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';

/**
 * Districts query.
 *
 * @param districtIds – A Vue ref containing an array of district IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useDistrictsQuery = (
  districtIds: Ref<Array<string>>,
  queryOptions?: QueryOptionsWithEnabled,
): UseQueryReturnType<any, Error> => {
  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(districtIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [DISTRICTS_QUERY_KEY, districtIds],
    queryFn: async () => await fetchDocumentsById(FIRESTORE_COLLECTIONS.DISTRICTS, districtIds.value),
    enabled: isQueryEnabled,
    meta: {
      errorMessage: 'Failed to fetch districts by ID',
      errorContext: {
        tags: { composable: 'useDistrictsQuery' },
        districtIds: districtIds.value,
      },
    },
    ...options,
  });
};

export default useDistrictsQuery;
