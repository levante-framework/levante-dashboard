// composables/usePermissions.ts
import { ref, computed, onMounted, readonly, toValue } from 'vue';
import { CacheService, PermissionDocument, PermissionService, type Resource, type Action, type Role } from '@levante-framework/permissions-core';
import { useAuthStore } from '@/store/auth';
import { getAxiosInstance, getBaseDocumentPath } from '@/helpers/query/utils';
import { storeToRefs } from 'pinia';

// Session-level cache
const cache = new CacheService(300000); // 5 minutes
const permissionService = new PermissionService(cache);

export const usePermissions = () => {
  const authStore = useAuthStore();
  const { isAuthenticated, firebaseUser, userData } = storeToRefs(authStore);
  const currentSite = toValue(authStore.currentSite);
  if (!isAuthenticated.value || !firebaseUser.value.adminFirebaseUser) return;
  
  const user = {
    uid: firebaseUser.value.adminFirebaseUser.uid,
    email: firebaseUser.value.adminFirebaseUser.email ?? '',
    roles: userData.value!.roles ?? [],
  };
  const permissionsLoaded = ref(false);

  // Load permissions from Firestore document
  const loadPermissions = async () => {
    const axiosInstance = getAxiosInstance();
    const response = await axiosInstance.post(getBaseDocumentPath(), {
      documents: [`${getBaseDocumentPath()}/system/permissions`],
    });
    
    // TODOL: Implement real-time listener for permission changes
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
};
