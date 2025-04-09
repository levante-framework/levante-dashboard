import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { type MaybeRef, unref } from 'vue';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { CLASSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for class data
interface ClassData {
  id: string;
  // Add other expected class properties here
  name?: string;
  schoolId?: string;
  [key: string]: any;
}

// Define the specific query options type
type ClassesQueryOptions = Omit<
  UseQueryOptions<ClassData[], Error, ClassData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled' // Keep enabled
>;

/**
 * Classes query.
 *
 * @param {MaybeRef<string[] | undefined>} classIds – The array of class IDs to fetch (can be a ref).
 * @param {ClassesQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<ClassData[], Error>} The TanStack query result.
 */
const useClassesQuery = (
  classIds: MaybeRef<string[] | undefined>,
  queryOptions: ClassesQueryOptions = {},
): UseQueryReturnType<ClassData[], Error> => {
  const queryConditions: Condition[] = [() => hasArrayEntries(classIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<ClassData[], Error, ClassData[], ReadonlyArray<unknown>>({
    // Pass classIds ref directly into query key
    queryKey: [CLASSES_QUERY_KEY, classIds],
    queryFn: async (): Promise<ClassData[]> => {
      const currentClassIds = unref(classIds);
      if (!currentClassIds || currentClassIds.length === 0) {
        return Promise.resolve([]); // Return empty array if no IDs
      }
      // Ensure fetchDocumentsById returns the correct type or cast
      const result = await fetchDocumentsById(FIRESTORE_COLLECTIONS.CLASSES, currentClassIds);
      return result as ClassData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useClassesQuery;
