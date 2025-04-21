import { computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { getPerformance, trace } from 'firebase/performance'; // Import Performance SDK
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
// @ts-ignore - JS Helper
import { fetchDocumentsById } from '@/helpers/query/utils';
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for an administration document
interface Administration {
    id: string;
    name?: string;
    // Add other known administration fields (orgId, taskVariantIds, userIds, etc.)
    [key: string]: any;
}

/**
 * Administrations query.
 *
 * @param administrationIds – A Vue ref containing an array of administration IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useAdministrationsQuery = (
    // administrationIds must be a Ref containing string[]
    administrationIds: Ref<string[]>,
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<Administration[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [(): boolean => hasArrayEntries(administrationIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  // Compute query key dynamically, dependent on administrationIds ref
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      ADMINISTRATIONS_QUERY_KEY, 
      administrationIds.value // Use .value which is string[]
  ]);

  // Get performance instance
  const perf = getPerformance();

  return useQuery<Administration[], Error>({
    queryKey, // Use computed key
    // Assuming fetchDocumentsById returns Promise<Administration[]>
    queryFn: async (): Promise<Administration[]> => {
        const idsToFetch = administrationIds.value;
        const queryTrace = trace(perf, 'fetch-administrations');
        queryTrace.start();
        // Add count as an attribute
        queryTrace.putAttribute('administration_count', String(idsToFetch.length));

        try {
            const results = await fetchDocumentsById(
                FIRESTORE_COLLECTIONS.ADMINISTRATIONS, 
                idsToFetch // Pass the string[] array value
            );
            return results as Administration[]; // Assume helper returns correct type or cast
        } catch (error) {
            console.error('Error fetching administrations:', error);
            queryTrace.putAttribute('error', 'true');
            throw error;
        } finally {
            queryTrace.stop();
        }
    },
    enabled: isQueryEnabled, // Use enabled status from helper
    ...options,
  });
};

export default useAdministrationsQuery; 