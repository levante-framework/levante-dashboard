// composables/usePermissions.ts
import { ref, computed, onMounted, readonly, toValue } from 'vue';
import { CacheService, PermissionDocument, PermissionService, type Resource, type Action, type Role, type UserRole as CoreUserRole } from '@levante-framework/permissions-core';
import { useAuthStore } from '@/store/auth';
import { getAxiosInstance, getBaseDocumentPath } from '@/helpers/query/utils';
import { storeToRefs } from 'pinia';

interface UserData {
  roles: CoreUserRole[];
}

// Session-level cache
const cache = new CacheService(300000); // 5 minutes
const permissionService = new PermissionService(cache);

export const usePermissions = () => {
  const authStore = useAuthStore();
  const { isAuthenticated, firebaseUser, userData, shouldUsePermissions } = storeToRefs(authStore);

  // Use computed to make the return value reactive to shouldUsePermissions changes
  return computed(() => {
    // Return safe defaults when permissions are disabled - let old system handle permissions
    if (!shouldUsePermissions.value) {
      console.log('flag - using old permissions');
      return {
        can: () => false,
        canGlobal: () => false,
        hasRole: () => false,
        permissions: computed(() => ({})),
        permissionsLoaded: readonly(ref(false)),
      };
    }

    const currentSite = toValue(authStore.currentSite);
    if (!isAuthenticated.value || !firebaseUser.value.adminFirebaseUser) {
      console.log('not authenticated or no firebase user - using old permissions');
      return {
        can: () => false,
        canGlobal: () => false,
        hasRole: () => false,
        permissions: computed(() => ({})),
        permissionsLoaded: readonly(ref(false)),
      };
    }
  
  const user = {
    uid: firebaseUser.value.adminFirebaseUser.uid,
    email: firebaseUser.value.adminFirebaseUser.email ?? '',
    roles: ((userData.value as UserData)?.roles ?? []) as CoreUserRole[],
  };
  const permissionsLoaded = ref(false);

  // Load permissions from Firestore document
  const loadPermissions = async () => {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.get(`${getBaseDocumentPath()}/system/permissions`);
    
    // TODO: Implement real-time listener for permission changes
    // onSnapshot(permissionsRef, (doc) => {
    //   if (doc.exists()) {
    //     const data = response.data;
    //     PermissionService.loadPermissions(data.matrix as PermissionMatrix);
    //     permissionsLoaded.value = true;
    //   } else {
    //     console.error('Permissions document not found');
    //   }
    // }, (error) => {
    //   console.error('Failed to load permissions:', error);
    // });

    const data = response.data;
    permissionService.loadPermissions(data.matrix as PermissionDocument);
    permissionsLoaded.value = true;
  };

  onMounted(() => {
    if (isAuthenticated) {
      loadPermissions();
    }
  });

  const can = (resource: Resource, action: Action): boolean => {
    if (!permissionsLoaded.value || !user || !currentSite) return false;
    
    return permissionService.canPerformSiteAction(
      user, 
      currentSite, 
      resource, 
      action
    );
  };

  const canGlobal = (resource: Resource, action: Action): boolean => {
    if (!permissionsLoaded.value || !user) return false;
    
    return permissionService.canPerformGlobalAction(user, resource, action);
  };

  const hasRole = (role: Role): boolean => {
    if (!permissionsLoaded.value || !user || !currentSite) return false;
    
    const userRole = permissionService.getUserSiteRole(
      user, 
      currentSite
    );

    console.log('userRole for current site: ', userRole);
    
    if (!userRole) return false;
    
    return permissionService.hasMinimumRole(userRole, role);
  };

  const permissions = computed(() => {
    if (!permissionsLoaded.value) return {};
    
    const resources = ['groups', 'assignments', 'users', 'admins', 'tasks'] as Resource[];
    const actions = ['create', 'read', 'update', 'delete', 'exclude'] as Action[];
    
    const perms: Record<string, Record<string, boolean>> = {};
    
    resources.forEach(resource => {
      const resourcePerms: Record<string, boolean> = {};
      actions.forEach(action => {
        const actionKey = `can${action.charAt(0).toUpperCase()}${action.slice(1)}`;
        resourcePerms[actionKey] = can(resource, action);
      });
      perms[resource] = resourcePerms;
    });
    
    return perms;
  });

    return {
      can,
      canGlobal,
      hasRole,
      permissions,
      permissionsLoaded: readonly(permissionsLoaded),
    };
  });
};
