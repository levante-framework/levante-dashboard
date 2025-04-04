import { Ref } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import { fetchUsersByOrg } from '@/helpers/query/users';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';

interface OrgUser {
  id: string;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<OrgUser[], Error>>;

/**
 * Organisation Users query.
 *
 * @param {string} orgType - The type of organization.
 * @param {string} orgId - The ID of the organization.
 * @param {number} page - The page number for pagination.
 * @param {string} orderBy - The field to order results by.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useOrgUsersQuery = (
  orgType: string,
  orgId: string,
  page: number,
  orderBy: string,
  queryOptions: QueryOptions | undefined = undefined
) => {
  const itemsPerPage = 1000000; // @TODO: Replace with a more reasonable value.

  return useQuery<OrgUser[], Error>({
    queryKey: [ORG_USERS_QUERY_KEY, orgType, orgId, page, orderBy],
    queryFn: async () => {
      const users = await fetchUsersByOrg(orgType, orgId, itemsPerPage, page, orderBy);
      return users as OrgUser[];
    },
    ...queryOptions,
  });
};

export default useOrgUsersQuery; 