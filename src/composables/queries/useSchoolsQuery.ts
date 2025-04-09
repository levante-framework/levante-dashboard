import { useQuery, type UseQueryReturnType, type UseQueryOptions, type QueryClient } from '@tanstack/vue-query';
import { isRef, computed, type MaybeRef, unref } from 'vue'; // Import unref
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { fetchDocumentsById } from '@/helpers/query/utils'; // Assume fetchDocumentsById is generic or returns predictable structure
import { SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for school data - replace with actual type if available
// Ensure this matches the actual data structure returned by Firestore/fetchDocumentsById
interface SchoolData {
  id: string;
  // Add other expected school properties here
  name?: string;
  // ... other fields
}

// Define the type for the query options, specifying the data and error types
type SchoolsQueryOptions = Omit<
  UseQueryOptions<SchoolData[], Error, SchoolData[], (string | MaybeRef<string[] | undefined>)[]>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * School Query
 *
 * @param {MaybeRef<string[] | undefined>} schoolIds – The array of school IDs to fetch (can be a ref or undefined).
 * @param {SchoolsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<SchoolData[], Error>} The TanStack query result.
 */
const useSchoolsQuery = (
  schoolIds: MaybeRef<string[] | undefined>,
  queryOptions: SchoolsQueryOptions = {},
): UseQueryReturnType<SchoolData[], Error> => {
  // Pass the condition function directly
  const conditions = [() => hasArrayEntries(schoolIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  // Type arguments for useQuery: TQueryFnData, TError, TData, TQueryKey
  return useQuery<SchoolData[], Error, SchoolData[], (string | MaybeRef<string[] | undefined>)[]>({
    queryKey: [SCHOOLS_QUERY_KEY, schoolIds], // Pass ref directly, TanStack handles it
    queryFn: async (): Promise<SchoolData[]> => {
      const currentIds = unref(schoolIds); // Safely unwrap potential ref

      // If no IDs are provided, return an empty array
      if (!currentIds || currentIds.length === 0) {
        return Promise.resolve([] as SchoolData[]);
      }

      // Assume fetchDocumentsById returns the data matching SchoolData structure
      // If fetchDocumentsById is not generic, casting might be needed:
      // return fetchDocumentsById(FIRESTORE_COLLECTIONS.SCHOOLS, currentIds) as Promise<SchoolData[]>;
      const result = await fetchDocumentsById(FIRESTORE_COLLECTIONS.SCHOOLS, currentIds);
      // Add runtime check/transform if necessary to ensure result matches SchoolData[]
      return result as SchoolData[]; // Cast if confident, otherwise validate
    },
    enabled: isQueryEnabled, // Use the computed value
    ...options, // Spread the computed options
  });
};

export default useSchoolsQuery;
