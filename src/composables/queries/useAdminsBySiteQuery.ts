import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchAdminsBySite } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { computed, Ref } from 'vue';

const useAdminsBySiteQuery = (
  siteId: Ref<string>,
  siteName: Ref<string>,
  queryOptions?: UseQueryOptions,
): UseQueryReturnType => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const id = computed(() => siteId.value || currentSite.value);

  return useQuery({
    queryKey: [ADMINS_QUERY_KEY, id],
    queryFn: async () => await fetchAdminsBySite(id, siteName),
    ...queryOptions,
  });
};

export default useAdminsBySiteQuery;
