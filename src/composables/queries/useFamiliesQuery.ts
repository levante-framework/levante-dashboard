import { computed, type Ref, type ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
// @ts-ignore - JS Helper
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

  // Determine if query should be enabled based on array entries
  const conditions = [(): boolean => hasArrayEntries(familyIds)];
  // We only extract isQueryEnabled, ignore the potentially incompatible options from the JS helper
  const { isQueryEnabled } = computeQueryOverrides(conditions, queryOptions ?? {});

  const queryKey: ComputedRef<QueryKey> = computed(() => [
      FAMILIES_QUERY_KEY,
      // Sort IDs to ensure stable query key regardless of order
      [...(familyIds.value)].sort()
  ]);

  return useQuery<Family[], Error>({
    queryKey,
    queryFn: (): Promise<Family[]> =>
        fetchDocumentsById(
            FIRESTORE_COLLECTIONS.FAMILIES,
            familyIds.value
        ),
    enabled: isQueryEnabled,
    // Cast spread options to any to bypass type checking issues potentially caused by computeQueryOverrides
    ...(queryOptions as any),
  });
};

export default useFamiliesQuery; 