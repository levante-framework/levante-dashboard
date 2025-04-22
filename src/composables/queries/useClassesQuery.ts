import { computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
// @ts-ignore - JS Helper
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
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<Class[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [(): boolean => hasArrayEntries(classIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  // Compute query key dynamically, dependent on classIds ref
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      CLASSES_QUERY_KEY, 
      classIds.value // Use .value which is string[]
  ]);

  return useQuery<Class[], Error>({
    queryKey, // Use computed key
    // Assuming fetchDocumentsById returns Promise<Class[]>
    queryFn: (): Promise<Class[]> => 
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.CLASSES, 
            classIds.value // Pass the string[] array value
        ),
    enabled: isQueryEnabled, // Use enabled status from helper
    ...options,
  });
};

export default useClassesQuery; 