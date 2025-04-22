import { computed, type Ref, type ComputedRef, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { getPerformance, trace } from 'firebase/performance'; // Import Performance SDK
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for an administration document
export interface Administration {
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
    administrationIds: Ref<string[]>,
    queryOptions?: QueryOptions<Administration[], Error>
): UseQueryReturnType<Administration[], Error> => {

  // Directly compute enabled state using hasArrayEntries
  const isQueryEnabled: ComputedRef<boolean> = computed(() => {
      return hasArrayEntries(administrationIds);
  });

  const queryKey: ComputedRef<QueryKey> = computed(() => {
      // Filter for valid string IDs before spreading and sorting
      const validIds = administrationIds.value?.filter(id => typeof id === 'string' && id.length > 0) ?? [];
      return [
          ADMINISTRATIONS_QUERY_KEY, 
          // Sort only the valid string IDs
          [...validIds].sort()
      ];
  });

  const perf = getPerformance();

  return useQuery<Administration[], Error>({
    // Spread original options first
    ...(queryOptions ?? {}),
    // Override queryKey and enabled
    queryKey,
    queryFn: async (): Promise<Administration[]> => {
        const idsToFetch = administrationIds.value;
        const queryTrace = trace(perf, 'fetch-administrations');
        queryTrace.start();
        queryTrace.putAttribute('administration_count', String(idsToFetch.length));

        try {
            // Assume fetchDocumentsById returns a structure compatible with Administration[]
            const results = await fetchDocumentsById(
                FIRESTORE_COLLECTIONS.ADMINISTRATIONS, 
                idsToFetch 
            );
            // Ensure results are properly cast or processed if needed
            return results as Administration[]; 
        } catch (error) {
            console.error('Error fetching administrations:', error);
            queryTrace.putAttribute('error', 'true');
            throw error;
        } finally {
            queryTrace.stop();
        }
    },
    enabled: isQueryEnabled, // Use the directly computed enabled state
  });
};

export default useAdministrationsQuery; 