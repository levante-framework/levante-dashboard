import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { USER_PERMISSIONS_QUERY_KEY } from '@/constants/queryKeys';
import { mapRolesToPermissions } from '@/helpers/query/permissions';
import { fetchAllDocuments } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import { Role } from '@/types';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { computed } from 'vue';

const useUserPermissionsQuery = (userRoles?: Role[], queryOptions?: UseQueryOptions): UseQueryReturnType => {
  const authStore = useAuthStore();
  const userData = authStore?.userData;
  const roles = userRoles || (userData?.roles as Role[]);

  const query = useQuery({
    queryKey: [USER_PERMISSIONS_QUERY_KEY, [...roles]],
    queryFn: async () => fetchAllDocuments(FIRESTORE_COLLECTIONS.SYSTEM),
    ...queryOptions,
  });

  const rolesWithPermissions = computed(() => {
    if (!query?.data?.value?.permissions) return [];
    return mapRolesToPermissions(roles, query.data.value.permissions);
  });

  return { ...query, rolesWithPermissions };
};

export default useUserPermissionsQuery;
