import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import type { Ref } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides, type QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';

/**
 * Administrations query.
 *
 * @param administrationIds – A Vue ref containing an array of administration IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useAdministrationsQuery = (
  administrationIds: Ref<Array<string>>,
  queryOptions?: QueryOptionsWithEnabled,
): UseQueryReturnType<any, Error> => {
  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(administrationIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [ADMINISTRATIONS_QUERY_KEY, administrationIds],
    queryFn: async () => await fetchDocumentsById(FIRESTORE_COLLECTIONS.ADMINISTRATIONS, administrationIds.value),
    enabled: isQueryEnabled,
    meta: {
      errorMessage: 'Failed to fetch administrations by ID',
      errorContext: {
        tags: { composable: 'useAdministrationsQuery' },
        administrationIds: administrationIds.value,
      },
    },
    ...options,
  });
};

export default useAdministrationsQuery;
