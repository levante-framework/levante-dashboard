import { toValue, MaybeRef, computed } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
// Make sure DocumentRequest is exported from utils or define it here
import { fetchDocsById, DocumentRequest } from '@/helpers/query/utils';
import { ADMINISTRATIONS_STATS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define AdministrationStats structure (adjust based on actual data)
interface AdministrationStats {
  id: string; // This will be 'total' from the docId
  // Add expected stats fields, e.g., userCount, completionRate, etc.
  [key: string]: any;
}

/**
 * Administrations stats query.
 *
 * @param {MaybeRef<string[]>} administrationIds – A Vue ref containing an array of administration IDs to fetch stats for.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<AdministrationStats[], Error>} The TanStack query result.
 */
const useAdministrationsStatsQuery = (
  administrationIds: MaybeRef<string[]>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<AdministrationStats[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(administrationIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  const queryKey = computed(() => [ADMINISTRATIONS_STATS_QUERY_KEY, toValue(administrationIds)] as const);

  const queryFn = async (): Promise<AdministrationStats[]> => {
    const ids = toValue(administrationIds);
    if (!ids || ids.length === 0) {
      return []; // Return empty if no IDs
    }
    // Construct the DocumentRequest array for fetchDocsById
    const documentsToFetch: DocumentRequest[] = ids.map((administrationId) => ({
      collection: FIRESTORE_COLLECTIONS.ADMINISTRATIONS,
      docId: `${administrationId}/stats/total`,
      // select: [...] // Add select fields if needed
    }));

    // fetchDocsById returns DocumentData[], needs casting
    const data = await fetchDocsById(documentsToFetch);
    return data as AdministrationStats[]; // Cast result
  };

  return useQuery<AdministrationStats[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options, // Spread the rest of the options
  });
};

export default useAdministrationsStatsQuery; 