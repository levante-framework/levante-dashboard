import { computed, type Ref, type ComputedRef, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { GROUPS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a group document
export interface Group {
    id: string;
    name?: string;
    // Add other known group fields
    [key: string]: any;
}

/**
 * Groups Query
 *
 * @param groupIds – A Vue ref containing the array of group IDs to fetch.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useGroupsQuery = (
    groupIds: Ref<string[]>,
    queryOptions?: QueryOptions<Group[], Error>
): UseQueryReturnType<Group[], Error> => {

  // Directly compute enabled state using hasArrayEntries
  const isQueryEnabled: ComputedRef<boolean> = computed(() => {
      return hasArrayEntries(groupIds);
  });

  const queryKey: ComputedRef<QueryKey> = computed(() => {
      // Filter for valid string IDs before spreading and sorting
      const validIds = groupIds.value?.filter(id => typeof id === 'string' && id.length > 0) ?? [];
      return [
          GROUPS_QUERY_KEY,
          // Sort only the valid string IDs
          [...validIds].sort()
      ];
  });

  return useQuery<Group[], Error>({
    // Spread original options first
    ...(queryOptions ?? {}),
    // Override queryKey and enabled
    queryKey,
    queryFn: (): Promise<Group[]> =>
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.GROUPS,
            groupIds.value // Pass the array value directly
        ),
    enabled: isQueryEnabled, // Use the directly computed enabled state
  });
};

export default useGroupsQuery; 