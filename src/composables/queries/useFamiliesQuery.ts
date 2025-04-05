import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { fetchDocumentsById, DocumentData } from '@/helpers/query/utils';
import { FAMILIES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { MaybeRef, toValue, computed } from 'vue';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define FamilyData structure (adjust based on actual data)
interface FamilyData extends DocumentData { // Extend DocumentData
  name?: string;
  // Add other known family properties
  [key: string]: any;
}

/**
 * Families Query
 *
 * @param {MaybeRef<string[]>} familyIds – A Vue ref containing an array of family IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<FamilyData[], Error>} The TanStack query result.
 */
const useFamiliesQuery = (
  familyIds: MaybeRef<string[]>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<FamilyData[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(familyIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  const queryKey = computed(() => [FAMILIES_QUERY_KEY, toValue(familyIds)] as const);

  const queryFn = async (): Promise<FamilyData[]> => {
    const ids = toValue(familyIds);
    if (!ids || ids.length === 0) {
        return []; // Return empty if no IDs are provided
    }
    const data = await fetchDocumentsById(FIRESTORE_COLLECTIONS.FAMILIES, ids);
    return data as FamilyData[]; // Cast result
  };

  return useQuery<FamilyData[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options, // Spread the rest of the options
  });
};

export default useFamiliesQuery; 