import { computed, toValue } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
// @ts-ignore - JS Helper
import { fetchDocsById } from '@/helpers/query/utils';
import { ADMINISTRATIONS_STATS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for an administration stats document
interface AdministrationStat {
    // Define fields expected in the 'stats/total' document
    totalParticipants?: number;
    tasksCompleted?: number;
    // Add other stats fields
    [key: string]: any;
}

// Structure for the input objects to fetchDocsById
interface FetchSpec {
    collection: string;
    docId: string;
}

/**
 * Administrations stats query.
 *
 * @param administrationIds – A Vue ref containing an array of administration IDs to fetch stats for.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useAdministrationsStatsQuery = (
    administrationIds: Ref<string[]>,
    queryOptions: any = undefined
): UseQueryReturnType<(AdministrationStat | null)[], Error> => { // Return type is array of stats or null

  const conditions = [(): boolean => hasArrayEntries(administrationIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  const queryKey: ComputedRef<QueryKey> = computed(() => [
      ADMINISTRATIONS_STATS_QUERY_KEY, 
      administrationIds.value
  ]);

  return useQuery<(AdministrationStat | null)[], Error>({
    queryKey,
    // Assuming fetchDocsById with array of FetchSpec returns Promise<(AdministrationStat | null)[]>
    queryFn: (): Promise<(AdministrationStat | null)[]> => {
        const ids = toValue(administrationIds);
        if (!Array.isArray(ids) || ids.length === 0) {
            return Promise.resolve([]); // Return empty array if no IDs
        }
        
        const fetchSpecs: FetchSpec[] = ids.map((administrationId: string) => ({
            collection: FIRESTORE_COLLECTIONS.ADMINISTRATIONS,
            docId: `${administrationId}/stats/total`,
          }));
          
        return fetchDocsById(fetchSpecs);
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useAdministrationsStatsQuery; 