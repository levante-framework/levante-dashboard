import { computed, type Ref, type ComputedRef, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { DISTRICTS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a district document
export interface District {
    id: string;
    name?: string;
    // Add other known district fields
    [key: string]: any;
}

/**
 * Districts Query
 *
 * @param districtIds – A Vue ref containing the array of district IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useDistrictsQuery = (
    districtIds: Ref<string[]>,
    queryOptions?: QueryOptions<District[], Error>
): UseQueryReturnType<District[], Error> => {

  // Directly compute enabled state using hasArrayEntries
  const isQueryEnabled: ComputedRef<boolean> = computed(() => {
      return hasArrayEntries(districtIds);
  });

  const queryKey: ComputedRef<QueryKey> = computed(() => {
      // Filter for valid string IDs before spreading and sorting
      const validIds = districtIds.value?.filter(id => typeof id === 'string' && id.length > 0) ?? [];
      return [
          DISTRICTS_QUERY_KEY,
          // Sort only the valid string IDs
          [...validIds].sort()
      ];
  });

  return useQuery<District[], Error>({
    // Spread original options first
    ...(queryOptions ?? {}),
    // Override queryKey and enabled
    queryKey,
    queryFn: (): Promise<District[]> =>
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.DISTRICTS,
            districtIds.value // Pass the array value directly
        ),
    enabled: isQueryEnabled, // Use the directly computed enabled state
  });
};

export default useDistrictsQuery; 