import { computed, type Ref, type ComputedRef, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a school document
export interface School {
    id: string;
    name?: string;
    // Add other known school fields
    [key: string]: any;
}

/**
 * Schools Query
 *
 * @param schoolIds – A Vue ref containing the array of school IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useSchoolsQuery = (
    schoolIds: Ref<string[]>,
    queryOptions?: QueryOptions<School[], Error>
): UseQueryReturnType<School[], Error> => {

  // Directly compute enabled state using hasArrayEntries
  const isQueryEnabled: ComputedRef<boolean> = computed(() => {
      return hasArrayEntries(schoolIds);
  });

  const queryKey: ComputedRef<QueryKey> = computed(() => {
      // Filter for valid string IDs before spreading and sorting
      const validIds = schoolIds.value?.filter(id => typeof id === 'string' && id.length > 0) ?? [];
      return [
          SCHOOLS_QUERY_KEY,
          // Sort only the valid string IDs
          [...validIds].sort()
      ];
  });

  return useQuery<School[], Error>({
    // Spread original options first
    ...(queryOptions ?? {}),
    // Override queryKey and enabled
    queryKey,
    queryFn: (): Promise<School[]> =>
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.SCHOOLS,
            schoolIds.value // Pass the array value directly
        ),
    enabled: isQueryEnabled, // Use the directly computed enabled state
  });
};

export default useSchoolsQuery; 