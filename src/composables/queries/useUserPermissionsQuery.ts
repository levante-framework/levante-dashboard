import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { USER_PERMISSIONS_QUERY_KEY } from '@/constants/queryKeys';
import { fetchAllDocuments } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { computed } from 'vue';

type UserRoleType = {
  role: string;
  siteId: string;
};

type UserRoleWithPermissionsType = UserRoleType & {
  permissions: {
    [action: string]: string[];
  };
};

const useGetUserPermissionsByRoleQuery = (
  userRoles?: UserRoleType[],
  queryOptions?: UseQueryOptions,
): UseQueryReturnType => {
  const authStore = useAuthStore();
  const userData = authStore?.userData;
  const roles = userRoles || (userData?.roles as UserRoleType[]);

  const query = useQuery({
    queryKey: [USER_PERMISSIONS_QUERY_KEY],
    queryFn: async () => fetchAllDocuments(FIRESTORE_COLLECTIONS.PERMISSIONS),
    ...queryOptions,
  });

  const rolesWithPermissions = computed<UserRoleWithPermissionsType[]>(() => {
    if (!query.data.value) return [];

    const permissionsMap = query.data.value;

    return roles.map(({ siteId, role }) => {
      const rolePermissions = permissionsMap[role] || {};
      const permissionsCopy = Object.entries(rolePermissions).reduce(
        (acc, [action, actions]) => {
          acc[action] = [...actions];
          return acc;
        },
        {} as Record<string, string[]>,
      );

      return {
        siteId,
        role,
        permissions: permissionsCopy,
      };
    });
  });

  return { ...query, rolesWithPermissions };
};

export default useGetUserPermissionsByRoleQuery;
