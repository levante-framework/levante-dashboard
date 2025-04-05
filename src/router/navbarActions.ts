import { isLevante } from '../helpers';
import { RouteLocationRaw } from 'vue-router';

interface NavbarAction {
  title: string;
  icon?: string;
  buttonLink: RouteLocationRaw;
  requiresSuperAdmin?: boolean;
  requiresAdmin?: boolean;
  project: 'ALL' | 'LEVANTE' | 'ROAR';
  category: string;
}

interface GetNavbarActionsParams {
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  includeHomeLink?: boolean;
}

const navbarActionOptions: NavbarAction[] = [
  {
    title: 'Back to Dashboard',
    icon: 'pi pi-arrow-left',
    buttonLink: { name: 'Home' },
    requiresSuperAdmin: false,
    requiresAdmin: false,
    project: 'ALL',
    category: 'Home',
  },
  {
    title: 'Audiences',
    buttonLink: { name: 'ListAudiences' },
    requiresSuperAdmin: false,
    requiresAdmin: true,
    project: 'ALL',
    category: 'Audience',
  },
  {
    title: 'View Assignments',
    icon: 'pi pi-list',
    buttonLink: { name: 'Home' },
    requiresSuperAdmin: false,
    requiresAdmin: true,
    project: 'ALL',
    category: 'Assignments',
  },
  {
    title: 'Create Assignment',
    icon: 'pi pi-sliders-h',
    buttonLink: { name: 'CreateAdministration' },
    requiresSuperAdmin: true,
    requiresAdmin: true,
    project: 'ALL',
    category: 'Assignments',
  },
  {
    title: 'Manage Tasks',
    icon: 'pi pi-pencil',
    buttonLink: { name: 'ManageTasksVariants' },
    requiresSuperAdmin: true,
    project: 'ALL',
    category: 'Assignments',
  },
  // TO DO: REMOVE USER "ACTIONS" AFTER NAMING 3 IS COMPLETE
  {
    title: 'Add Users',
    icon: 'pi pi-user-plus',
    buttonLink: { name: 'Add Users' },
    requiresSuperAdmin: true,
    requiresAdmin: true,
    project: 'LEVANTE',
    category: 'Users',
  },
  {
    title: 'Link Users',
    icon: 'pi pi-link',
    buttonLink: { name: 'Link Users' },
    requiresSuperAdmin: true,
    requiresAdmin: true,
    project: 'LEVANTE',
    category: 'Users',
  },
  {
    title: 'Edit Users',
    icon: 'pi pi-pencil',
    buttonLink: { name: 'Edit Users' },
    requiresSuperAdmin: true,
    requiresAdmin: true,
    project: 'LEVANTE',
    category: 'Users',
  },
  {
    title: 'Register New Family',
    icon: 'pi pi-home',
    buttonLink: { name: 'Register' },
    requiresSuperAdmin: true,
    project: 'ROAR',
    category: 'Users',
  },
  {
    title: 'Sync Passwords',
    icon: 'pi pi-arrows-h',
    buttonLink: { name: 'Sync Passwords' },
    requiresSuperAdmin: true,
    requiresAdmin: true,
    project: 'LEVANTE',
    category: 'Users',
  },
  {
    title: 'Register students',
    icon: 'pi pi-users',
    buttonLink: { name: 'RegisterStudents' },
    requiresSuperAdmin: true,
    requiresAdmin: true,
    project: 'ROAR',
    category: 'Users',
  },
  {
    title: 'Register administrator',
    icon: 'pi pi-user-plus',
    buttonLink: { name: 'CreateAdministrator' },
    requiresSuperAdmin: true,
    project: 'ALL',
    category: 'Users',
  },
];

export const getNavbarActions = ({
  isSuperAdmin = false,
  isAdmin = false,
  includeHomeLink = true,
}: GetNavbarActionsParams): NavbarAction[] => {
  let filteredActions = [];
  if (isLevante) {
    filteredActions = navbarActionOptions.filter((action) => {
      if (action.project === 'LEVANTE' || action.project === 'ALL') {
        if (
          (action.requiresAdmin && isAdmin) ||
          (action.requiresSuperAdmin && isSuperAdmin) ||
          (!action.requiresAdmin && !action.requiresSuperAdmin)
        ) {
          return true;
        } else {
          return false;
        }
      }
      return false;
    });
  } else {
    filteredActions = navbarActionOptions.filter((action) => {
      if (action.project === 'ROAR' || action.project === 'ALL') {
        if (action.requiresSuperAdmin === true && !isSuperAdmin) {
          return false;
        }
        if (action.requiresAdmin === true && !isAdmin) {
          return false;
        }
        return true;
      }
      return false;
    });
  }
  return filteredActions;
}; 