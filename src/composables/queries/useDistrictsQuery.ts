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
import { DISTRICTS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a district document
interface District {
    id: string;
    name?: string;
    // Add other known district fields
    [key: string]: any;
}

/**
 * Districts query.
 *
 * @param districtIds – A Vue ref containing the array of district IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useDistrictsQuery = (
    // Make districtIds Ref mandatory - must contain string[]
    districtIds: Ref<string[]>,
    queryOptions: any = undefined
): UseQueryReturnType<District[], Error> => {

  // hasArrayEntries should now work correctly with Ref<string[]>
  const conditions = [(): boolean => hasArrayEntries(districtIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  const queryKey: ComputedRef<QueryKey> = computed(() => [
      DISTRICTS_QUERY_KEY, 
      districtIds.value // Now guaranteed to be string[]
  ]);

  return useQuery<District[], Error>({
    queryKey,
    queryFn: (): Promise<District[]> => {
        const ids = districtIds.value;
        // Fetch directly, enabled check handles empty array case
        return fetchDocumentsById(
            FIRESTORE_COLLECTIONS.DISTRICTS, 
            ids
        );
    },
    // enabled logic can rely on isQueryEnabled and the array check from hasArrayEntries
    enabled: isQueryEnabled, 
    ...options,
  });
};

export default useDistrictsQuery; 