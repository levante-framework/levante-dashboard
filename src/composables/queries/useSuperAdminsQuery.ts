import { SUPER_ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchSuperAdmins } from '@/helpers/query/administrations';
import { useQuery, type UseQueryOptions, type UseQueryReturnType } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';

type SuperAdminsQueryOptions = Omit<UseQueryOptions, 'queryKey' | 'queryFn'>;

const useSuperAdminsQuery = (
  isTabActive: MaybeRefOrGetter<boolean>,
  queryOptions?: SuperAdminsQueryOptions,
): UseQueryReturnType<any, Error> => {
  const authStore = useAuthStore();

  const isEnabled = computed(() => authStore.isUserSuperAdmin() && toValue(isTabActive));

  return useQuery({
    queryKey: [SUPER_ADMINS_QUERY_KEY],
    queryFn: async () => await fetchSuperAdmins(),
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useSuperAdminsQuery;
