import { toValue, type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { fetchDocsById } from '@/helpers/query/utils';
import { ADMINISTRATIONS_STATS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for administration stats data
interface AdminStatsData {
  participantCount?: number;
  completedCount?: number;
  [key: string]: any;
}

// Define the structure expected by fetchDocsById based on original JS
interface DocumentSpecifier {
  collection: string;
  docId: string;
}

// Define specific query options type
type AdminStatsQueryOptions = Omit<
  UseQueryOptions<AdminStatsData[], Error, AdminStatsData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * Administrations stats query.
 *
 * @param {MaybeRef<string[] | undefined>} administrationIds – A Vue ref containing an array of administration IDs to fetch stats for.
 * @param {AdminStatsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<AdminStatsData[], Error>} The TanStack query result.
 */
const useAdministrationsStatsQuery = (
  administrationIds: MaybeRef<string[] | undefined>,
  queryOptions: AdminStatsQueryOptions = {},
): UseQueryReturnType<AdminStatsData[], Error> => {
  const queryConditions: Condition[] = [() => hasArrayEntries(administrationIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<AdminStatsData[], Error, AdminStatsData[], ReadonlyArray<unknown>>({
    queryKey: [ADMINISTRATIONS_STATS_QUERY_KEY, administrationIds],
    queryFn: async (): Promise<AdminStatsData[]> => {
      const currentAdminIds = unref(administrationIds);
      if (!currentAdminIds || currentAdminIds.length === 0) {
        return Promise.resolve([]);
      }
      // Map IDs to document specifiers
      const docSpecs: DocumentSpecifier[] = currentAdminIds.map((administrationId) => ({
        collection: FIRESTORE_COLLECTIONS.ADMINISTRATIONS,
        docId: `${administrationId}/stats/total`,
      }));

      // Fetch the documents using the array of specifiers
      // Ensure fetchDocsById correctly handles DocumentSpecifier[] input
      const result = await fetchDocsById(docSpecs);
      return result as AdminStatsData[]; // Cast result if necessary
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useAdministrationsStatsQuery;
