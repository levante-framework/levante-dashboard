import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { DISTRICTS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';

/**
 * Districts query.
 *
 * @param {Array} districtIds – The array of class IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useDistrictsQuery = (districtIds: string[], queryOptions?: UseQueryOptions): UseQueryReturnType => {
  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(districtIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);
  return useQuery({
    queryKey: [DISTRICTS_QUERY_KEY, districtIds],
    queryFn: () => fetchDocumentsById(FIRESTORE_COLLECTIONS.DISTRICTS, districtIds),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDistrictsQuery;
