import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { MaybeRef, toValue, computed } from 'vue';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define Administration structure (or import if defined elsewhere)
interface Administration {
  id: string;
  name: string;
  // Add other known administration properties
  [key: string]: any;
}

/**
 * Administrations query.
 *
 * @param {MaybeRef<string[]>} administrationIds – A Vue ref containing an array of administration IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<Administration[], Error>} The TanStack query result.
 */
const useAdministrationsQuery = (
  administrationIds: MaybeRef<string[]>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<Administration[], Error> => {

  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(administrationIds)]; // hasArrayEntries checks toValue internally
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  // Use 'as const' for better type inference
  const queryKey = computed(() => [ADMINISTRATIONS_QUERY_KEY, toValue(administrationIds)] as const);

  const queryFn = async (): Promise<Administration[]> => {
    const ids = toValue(administrationIds);
    if (!ids || ids.length === 0) {
        return []; // Return empty if no IDs are provided
    }
    // fetchDocumentsById already returns DocumentData[], needs casting
    const data = await fetchDocumentsById(FIRESTORE_COLLECTIONS.ADMINISTRATIONS, ids);
    return data as Administration[]; // Cast result to Administration[]
  };

  return useQuery<Administration[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options, // Spread the rest of the options
  });
};

export default useAdministrationsQuery; 