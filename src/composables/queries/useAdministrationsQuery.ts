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
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for an administration document
interface Administration {
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
    // administrationIds must be a Ref containing string[]
    administrationIds: Ref<string[]>,
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<Administration[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [(): boolean => hasArrayEntries(administrationIds)]; 
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions ?? {});

  // Compute query key dynamically, dependent on administrationIds ref
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      ADMINISTRATIONS_QUERY_KEY, 
      administrationIds.value // Use .value which is string[]
  ]);

  return useQuery<Administration[], Error>({
    queryKey, // Use computed key
    // Assuming fetchDocumentsById returns Promise<Administration[]>
    queryFn: (): Promise<Administration[]> => 
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.ADMINISTRATIONS, 
            administrationIds.value // Pass the string[] array value
        ),
    enabled: isQueryEnabled, // Use enabled status from helper
    ...options,
  });
};

export default useAdministrationsQuery; 