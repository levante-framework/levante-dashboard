import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { FAMILIES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface Family {
  id: string;
  name: string;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<Family[], Error>>;

/**
 * Families Query
 *
 * @param {string[]} familyIds – The array of family IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useFamiliesQuery = (
  familyIds: string[],
  queryOptions: QueryOptions | undefined = undefined
) => {
  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => hasArrayEntries(familyIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery<Family[], Error>({
    queryKey: [FAMILIES_QUERY_KEY, familyIds],
    queryFn: async () => {
      const families = await fetchDocumentsById(FIRESTORE_COLLECTIONS.FAMILIES, familyIds);
      return families as Family[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useFamiliesQuery; 