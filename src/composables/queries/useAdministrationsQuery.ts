import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { type MaybeRef, unref } from 'vue';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { hasArrayEntries } from '@/helpers/hasArrayEntries.ts';
import { fetchDocumentsById } from '@/helpers/query/utils';
import { ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface AdministrationData {
  id: string;
  name: string;
  [key: string]: any;
}

type AdministrationsQueryOptions = Omit<
  UseQueryOptions<AdministrationData[], Error, AdministrationData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * Administrations query.
 *
 * @param {MaybeRef<string[] | undefined>} administrationIds – The array of administration IDs to fetch (can be a ref).
 * @param {AdministrationsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<AdministrationData[], Error>} The TanStack query result.
 */
const useAdministrationsQuery = (
  administrationIds: MaybeRef<string[] | undefined>,
  queryOptions: AdministrationsQueryOptions = {},
): UseQueryReturnType<AdministrationData[], Error> => {
  const queryConditions: Condition[] = [() => hasArrayEntries(administrationIds)];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<AdministrationData[], Error, AdministrationData[], ReadonlyArray<unknown>>({
    queryKey: [ADMINISTRATIONS_QUERY_KEY, administrationIds],
    queryFn: async (): Promise<AdministrationData[]> => {
      const currentAdminIds = unref(administrationIds);
      if (!currentAdminIds || currentAdminIds.length === 0) {
        return Promise.resolve([]);
      }
      const result = await fetchDocumentsById(FIRESTORE_COLLECTIONS.ADMINISTRATIONS, currentAdminIds);
      return result as AdministrationData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useAdministrationsQuery; 