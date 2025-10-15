import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchAdminsBySite } from '@/helpers/query/utils';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { Ref } from 'vue';

const useAdminsBySiteQuery = (
  siteId: Ref<string>,
  siteName?: Ref<string>,
  queryOptions?: UseQueryOptions,
): UseQueryReturnType => {
  // @TODO We might use the authStore selected site ID

  const queryKey = siteName?.value ? [ADMINS_QUERY_KEY, siteId, siteName] : [ADMINS_QUERY_KEY, siteId];

  return useQuery({
    queryKey,
    queryFn: async () => await fetchAdminsBySite(siteId, siteName),
    ...queryOptions,
  });
};

export default useAdminsBySiteQuery;
