import { computed, type Ref, type ComputedRef, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { CLASSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a class document
export interface Class {
    id: string;
    name?: string;
    // Add other known class fields (e.g., schoolId, teacherId)
    [key: string]: any;
}

/**
 * Classes query.
 *
 * @param classIds – A Vue ref containing the array of class IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useClassesQuery = (
    // classIds must be a Ref containing string[]
    classIds: Ref<string[]>,
    queryOptions?: QueryOptions<Class[], Error>
): UseQueryReturnType<Class[], Error> => {

  // Directly compute enabled state using hasArrayEntries
  const isQueryEnabled: ComputedRef<boolean> = computed(() => {
      return hasArrayEntries(classIds);
  });

  const queryKey: ComputedRef<QueryKey> = computed(() => {
      // Filter for valid string IDs before spreading and sorting
      const validIds = classIds.value?.filter(id => typeof id === 'string' && id.length > 0) ?? [];
      return [
          CLASSES_QUERY_KEY,
          // Sort only the valid string IDs
          [...validIds].sort()
      ];
  });

  return useQuery<Class[], Error>({
    // Spread original options first
    ...(queryOptions ?? {}),
    // Override queryKey and enabled
    queryKey,
    queryFn: (): Promise<Class[]> =>
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.CLASSES,
            classIds.value // Pass the array value directly
        ),
    enabled: isQueryEnabled, // Use the directly computed enabled state
  });
};

export default useClassesQuery; 