import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { computed, toValue, type Ref, ref } from 'vue';
// @ts-ignore - users.ts uses utils which might still be JS
import { fetchUsersByOrg } from '@/helpers/query/users';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';

// Assuming UserData interface is defined (or import from where it is, e.g., users.ts?)
// Replicating basic structure here for now
interface UserData {
    id: string;
    [key: string]: any;
}

// Assuming OrderBy interface is defined (e.g., in users.ts or a common types file)
interface OrderBy {
    field: { fieldPath: string };
    direction: 'ASCENDING' | 'DESCENDING';
}

/**
 * Organisation Users query.
 *
 * Fetches all users belonging to a specific organization.
 *
 * @param orgType - Ref containing the organization type (e.g., 'schools').
 * @param orgId - Ref containing the organization ID.
 * @param page - Ref containing the page number (currently ignored due to large itemsPerPage).
 * @param orderBy - Ref containing the order by configuration.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useOrgUsersQuery = (
    orgType: Ref<string | null>,
    orgId: Ref<string | null>,
    page: Ref<number>,
    orderBy: Ref<OrderBy[] | undefined>,
    queryOptions?: QueryOptions<UserData[], Error>
): UseQueryReturnType<UserData[], Error> => {

  // TODO: Replace with a more reasonable value or implement actual pagination.
  const itemsPerPage = ref(1000000);

  const queryKey = computed<QueryKey>(() => [
      ORG_USERS_QUERY_KEY,
      toValue(orgType),
      toValue(orgId),
      // toValue(page), // Page doesn't affect query if itemsPerPage is huge
      // orderBy value might be complex, consider stringifying or simplifying for key
      JSON.stringify(toValue(orderBy)) ?? 'defaultOrder',
  ]);

  // Query is enabled only if orgType and orgId have values
  const isEnabled = computed(() => !!toValue(orgType) && !!toValue(orgId));

  return useQuery<UserData[], Error>({
    queryKey,
    // Pass refs directly to fetchUsersByOrg
    queryFn: () => fetchUsersByOrg(orgType, orgId, itemsPerPage, page, orderBy, ref(false)), // Pass restrictToActiveUsers = false
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useOrgUsersQuery; 