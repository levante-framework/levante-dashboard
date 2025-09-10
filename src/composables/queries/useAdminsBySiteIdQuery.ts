import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchAdminsBySiteId } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { computed } from 'vue';

const useAdminsBySiteIdQuery = (siteId: string, queryOptions?: UseQueryOptions): UseQueryReturnType => {
  const authStore = useAuthStore();
  // Check where the selectedSiteId is gonna come from...
  const id = computed(() => siteId || authStore?.selectedSiteId?.value);

  return useQuery({
    queryKey: [ADMINS_QUERY_KEY, id.value],
    queryFn: async () => await fetchAdminsBySiteId(id.value),
    ...queryOptions,
  });
};

export default useAdminsBySiteIdQuery;
