import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { fetchDocumentsById, DocumentData } from '@/helpers/query/utils';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { CLASSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { MaybeRef, toValue, computed } from 'vue';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define ClassData structure (adjust based on actual data)
interface ClassData extends DocumentData { // Extend DocumentData
  name?: string;
  // Add other known class properties
  [key: string]: any;
}

/**
 * Classes query.
 *
 * @param {MaybeRef<string[]>} classIds – A Vue ref containing an array of class IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<ClassData[], Error>} The TanStack query result.
 */
const useClassesQuery = (
  classIds: MaybeRef<string[]>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<ClassData[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(classIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  const queryKey = computed(() => [CLASSES_QUERY_KEY, toValue(classIds)] as const);

  const queryFn = async (): Promise<ClassData[]> => {
    const ids = toValue(classIds);
    if (!ids || ids.length === 0) {
        return []; // Return empty if no IDs are provided
    }
    // fetchDocumentsById returns DocumentData[], needs casting
    const data = await fetchDocumentsById(FIRESTORE_COLLECTIONS.CLASSES, ids);
    return data as ClassData[]; // Cast result to ClassData[]
  };

  return useQuery<ClassData[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options, // Spread the rest of the options
  });
};

export default useClassesQuery; 