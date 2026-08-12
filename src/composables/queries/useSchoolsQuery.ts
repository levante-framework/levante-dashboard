import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import type { Ref } from 'vue';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides, type QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';

/**
 * School Query
 *
 * @param schoolIds – A Vue ref containing an array of school IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useSchoolsQuery = (
  schoolIds: Ref<Array<string>>,
  queryOptions?: QueryOptionsWithEnabled,
): UseQueryReturnType<any, Error> => {
  // Ensure all necessary data is loaded before enabling the query.
  const conditions = [() => hasArrayEntries(schoolIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery({
    queryKey: [SCHOOLS_QUERY_KEY, schoolIds],
    queryFn: async () => await fetchDocumentsById(FIRESTORE_COLLECTIONS.SCHOOLS, schoolIds.value),
    enabled: isQueryEnabled,
    meta: {
      errorMessage: 'Failed to fetch schools by ID',
      errorContext: {
        tags: { composable: 'useSchoolsQuery' },
        schoolIds: schoolIds.value,
      },
    },
    ...options,
  });
};

export default useSchoolsQuery;
