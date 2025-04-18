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
import { GROUPS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a group document
interface Group {
    id: string;
    name?: string;
    // Add other known group fields
    [key: string]: any;
}

/**
 * Group Query
 *
 * @param groupIds – A Vue ref containing the array of group IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useGroupsQuery = (
    // groupIds must be a Ref containing string[]
    groupIds: Ref<string[]>,
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<Group[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [(): boolean => hasArrayEntries(groupIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  // Compute query key dynamically, dependent on groupIds ref
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      GROUPS_QUERY_KEY, 
      groupIds.value // Use .value which is string[]
  ]);

  return useQuery<Group[], Error>({
    queryKey, // Use computed key
    // Assuming fetchDocumentsById returns Promise<Group[]>
    queryFn: (): Promise<Group[]> => 
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.GROUPS, 
            groupIds.value // Pass the string[] array value
        ),
    enabled: isQueryEnabled, // Use enabled status from helper
    ...options,
  });
};

export default useGroupsQuery; 