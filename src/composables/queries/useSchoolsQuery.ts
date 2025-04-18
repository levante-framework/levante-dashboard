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
import { SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a school document
interface School {
    id: string;
    name?: string;
    // Add other known school fields
    [key: string]: any;
}

/**
 * School Query
 *
 * @param schoolIds – A Vue ref containing the array of school IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useSchoolsQuery = (
    // schoolIds must be a Ref containing string[]
    schoolIds: Ref<string[]>,
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<School[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [(): boolean => hasArrayEntries(schoolIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  // Compute query key dynamically, dependent on schoolIds ref
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      SCHOOLS_QUERY_KEY, 
      schoolIds.value // Use .value which is string[]
  ]);

  return useQuery<School[], Error>({
    queryKey, // Use computed key
    // Assuming fetchDocumentsById returns Promise<School[]>
    queryFn: (): Promise<School[]> => 
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.SCHOOLS, 
            schoolIds.value // Pass the string[] array value
        ),
    enabled: isQueryEnabled, // Use enabled status from helper
    ...options,
  });
};

export default useSchoolsQuery; 