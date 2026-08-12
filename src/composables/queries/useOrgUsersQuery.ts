import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchUsersByOrg } from '@/helpers/query/users';

/**
 * Organisation Users query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useOrgUsersQuery = (orgType, orgId, page, orderBy, queryOptions?: UseQueryOptions): UseQueryReturnType => {
  const itemsPerPage = 1000000; // @TODO: Replace with a more reasonable value.

  return useQuery({
    queryKey: [ORG_USERS_QUERY_KEY, orgType, orgId, page, orderBy],
    queryFn: () => fetchUsersByOrg(orgType, orgId, itemsPerPage, page, orderBy),
    ...queryOptions,
  });
};

export default useOrgUsersQuery;
