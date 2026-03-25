import { SUPER_ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { useQuery, type UseQueryOptions, type UseQueryReturnType } from '@tanstack/vue-query';
import type { DocumentData } from 'firebase/firestore';
import { useAuthStore } from '@/store/auth';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';

type SuperAdminUser = DocumentData & { id: string };

type SuperAdminsQueryOptions = Omit<UseQueryOptions, 'queryKey' | 'queryFn'>;

const useSuperAdminsQuery = (
  isTabActive: MaybeRefOrGetter<boolean>,
  queryOptions?: SuperAdminsQueryOptions,
): UseQueryReturnType<SuperAdminUser[], Error> => {
  const authStore = useAuthStore();

  const isEnabled = computed(() => authStore.isUserSuperAdmin() && toValue(isTabActive));

  return useQuery({
    queryKey: [SUPER_ADMINS_QUERY_KEY],
    queryFn: async () => usersRepository.fetchAdminUsers({ superAdminsOnly: true }),
    enabled: isEnabled,
    ...queryOptions,
  });
};

export default useSuperAdminsQuery;
