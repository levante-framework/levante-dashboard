import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { logger } from '@/logger';

/**
 * Administrations query.
 *
 * @param {ref<Array<String>>} administrationIds – A Vue ref containing an array of administration IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useAdministrationsQuery = (administrationIds, queryOptions?: UseQueryOptions): UseQueryReturnType => {
  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(administrationIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [ADMINISTRATIONS_QUERY_KEY, administrationIds],
    queryFn: async () => {
      try {
        return await fetchDocumentsById(FIRESTORE_COLLECTIONS.ADMINISTRATIONS, administrationIds);
      } catch (error) {
        logger.error(new Error('Failed to fetch administrations by ID', { cause: error }), {
          tags: { function: 'useAdministrationsQuery' },
        });
        return [];
      }
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useAdministrationsQuery;
