import { computed, type Ref, type ComputedRef, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { FAMILIES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a family document
// Export the Family interface
export interface Family {
    id: string;
    name?: string;
    // Add other known family fields
    [key: string]: any;
}

/**
 * Families Query
 *
 * @param familyIds – A Vue ref containing the array of family IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useFamiliesQuery = (
    familyIds: Ref<string[]>,
    queryOptions?: QueryOptions<Family[], Error>
): UseQueryReturnType<Family[], Error> => {

  // Directly compute enabled state using hasArrayEntries
  // Query is enabled ONLY if the familyIds array has entries.
  // Ignore potential 'enabled' from queryOptions for simplicity due to type issues.
  const isQueryEnabled: ComputedRef<boolean> = computed(() => {
      return hasArrayEntries(familyIds);
  });

  const queryKey: ComputedRef<QueryKey> = computed(() => {
      // Filter for valid string IDs before spreading and sorting
      const validIds = familyIds.value?.filter(id => typeof id === 'string' && id.length > 0) ?? [];
      return [
          FAMILIES_QUERY_KEY,
          // Sort only the valid string IDs
          [...validIds].sort()
      ];
  });

  return useQuery<Family[], Error>({
    // Spread original options first
    ...(queryOptions ?? {}),
    // Override queryKey and enabled
    queryKey,
    queryFn: (): Promise<Family[]> =>
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.FAMILIES,
            familyIds.value // Pass the array value directly
        ),
    enabled: isQueryEnabled, // Use the directly computed enabled state
  });
};

export default useFamiliesQuery; 