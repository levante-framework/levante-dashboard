import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchAdminsBySite } from '@/helpers/query/administrations';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { computed, Ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';

type AdminsQueryOptions = Omit<UseQueryOptions, 'queryKey' | 'queryFn'>;

const useAdminsBySiteQuery = (
  selectedSite: Ref<any>,
  queryOptions?: AdminsQueryOptions,
): UseQueryReturnType<any, Error> => {
  const authStore = useAuthStore();
  const { sites } = storeToRefs(authStore);
  const siteId = computed(() => selectedSite.value);
  const siteName = computed(() => sites?.value?.find((site: { siteId: string }) => site.siteId === siteId.value)?.siteName);

console.log('sites in useAdminsBySiteQuery: ', sites.value);
console.log('siteId in useAdminsBySiteQuery: ', siteId.value);
console.log('siteName in useAdminsBySiteQuery: ', siteName.value);

  return useQuery({
    queryKey: [ADMINS_QUERY_KEY, siteId, siteName],
    queryFn: async () => await fetchAdminsBySite(siteId, siteName),
    ...queryOptions,
  });
};

export default useAdminsBySiteQuery;
