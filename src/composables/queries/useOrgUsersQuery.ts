import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';
import { ListUsersParams, ListUsersUser } from '@levante-framework/levante-zod';
import { useQuery, type UseQueryOptions, type UseQueryReturnType } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { type MaybeRefOrGetter, toValue } from 'vue';

/**
 * Organisation Users query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useOrgUsersQuery = (
  orgType: MaybeRefOrGetter<ListUsersParams['orgType']>,
  orgId: MaybeRefOrGetter<string>,
  page: MaybeRefOrGetter<number>,
  orderBy: MaybeRefOrGetter<string | null>,
  queryOptions?: UseQueryOptions<ListUsersUser[], Error>,
): UseQueryReturnType<ListUsersUser[], Error> => {
  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);
  const itemsPerPage = 1000000; // @TODO: Replace with a more reasonable value.

  return useQuery({
    queryKey: [ORG_USERS_QUERY_KEY, toValue(orgType), toValue(orgId), toValue(page), toValue(orderBy)],
    queryFn: async () => {
      const result = await roarfirekit.value!.getOrgUsers({
        orgType: toValue(orgType),
        orgId: toValue(orgId),
        itemsPerPage: toValue(itemsPerPage),
        page: toValue(page),
        orderBy: toValue(orderBy),
      });

      return result.users;
    },
    ...queryOptions,
  });
};

export default useOrgUsersQuery;
