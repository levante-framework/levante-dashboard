import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { type MaybeRef, unref } from 'vue';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { fetchDocumentsById } from '@/helpers/query/utils'; // Assume returns FamilyData[]
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { FAMILIES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for family data
interface FamilyData {
  id: string;
  // Add other expected family properties here
  careTakerName?: string;
  studentIds?: string[];
  [key: string]: any;
}

// Define the specific query options type
type FamiliesQueryOptions = Omit<
  UseQueryOptions<FamilyData[], Error, FamilyData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * Families Query
 *
 * @param {MaybeRef<string[] | undefined>} familyIds – The array of family IDs to fetch (can be a ref).
 * @param {FamiliesQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<FamilyData[], Error>} The TanStack query result.
 */
const useFamiliesQuery = (
  familyIds: MaybeRef<string[] | undefined>,
  queryOptions: FamiliesQueryOptions = {},
): UseQueryReturnType<FamilyData[], Error> => {
  const queryConditions: Condition[] = [() => hasArrayEntries(familyIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<FamilyData[], Error, FamilyData[], ReadonlyArray<unknown>>({
    queryKey: [FAMILIES_QUERY_KEY, familyIds],
    queryFn: async (): Promise<FamilyData[]> => {
      const currentFamilyIds = unref(familyIds);
      if (!currentFamilyIds || currentFamilyIds.length === 0) {
        return Promise.resolve([]);
      }
      const result = await fetchDocumentsById(FIRESTORE_COLLECTIONS.FAMILIES, currentFamilyIds);
      return result as FamilyData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useFamiliesQuery;
