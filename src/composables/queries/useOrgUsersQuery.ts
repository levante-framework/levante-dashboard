import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { type MaybeRef, unref } from 'vue';
import { fetchUsersByOrg } from '@/helpers/query/users';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';

// Placeholder type for user data associated with an org
interface OrgUserData {
  id: string;
  // Add other expected user properties
  name?: string;
  email?: string;
  [key: string]: any;
}

// Define the specific query options type
type OrgUsersQueryOptions = Omit<
  UseQueryOptions<OrgUserData[], Error, OrgUserData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn'
>;

/**
 * Organisation Users query.
 *
 * @param {MaybeRef<string | undefined>} orgType - The type of the organisation.
 * @param {MaybeRef<string | undefined>} orgId - The ID of the organisation.
 * @param {MaybeRef<number | undefined>} page - The page number for pagination.
 * @param {MaybeRef<string | undefined>} orderBy - The field to order by.
 * @param {OrgUsersQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgUserData[], Error>} The TanStack query result.
 */
const useOrgUsersQuery = (
  orgType: MaybeRef<string | undefined>,
  orgId: MaybeRef<string | undefined>,
  page: MaybeRef<number | undefined>,
  orderBy: MaybeRef<string | undefined>,
  queryOptions: OrgUsersQueryOptions = {},
): UseQueryReturnType<OrgUserData[], Error> => {
  const itemsPerPage = 1000000; // @TODO: Replace with a more reasonable value.

  // Define query key using MaybeRef values
  const queryKey = [ORG_USERS_QUERY_KEY, orgType, orgId, page, orderBy];

  return useQuery<OrgUserData[], Error, OrgUserData[], ReadonlyArray<unknown>>({
    queryKey: queryKey,
    queryFn: async (): Promise<OrgUserData[]> => {
      // Unwrap MaybeRef values for the fetch function
      const currentOrgType = unref(orgType);
      const currentOrgId = unref(orgId);
      const currentPage = unref(page);
      const currentOrderBy = unref(orderBy);

      // Need to ensure required parameters are present before fetching
      if (!currentOrgType || !currentOrgId) {
        console.warn('[useOrgUsersQuery] orgType and orgId are required to fetch users.');
        return Promise.resolve([]); // Return empty if required params missing
      }

      // Ensure fetchUsersByOrg returns the correct type or cast
      const result = await fetchUsersByOrg(
        currentOrgType,
        currentOrgId,
        itemsPerPage,
        currentPage ?? 1, // Default to page 1 if undefined
        currentOrderBy ?? '', // Default to empty string if undefined
      );
      return result as OrgUserData[];
    },
    ...queryOptions,
  });
};

export default useOrgUsersQuery;
