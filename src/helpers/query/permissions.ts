import { Role } from '@/types';

export const mapRolesToPermissions = (roles: Role[], permissionsMap: Record<string, Record<string, string[]>>) => {
  return roles.map(({ siteId, role }: Role) => {
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
};
