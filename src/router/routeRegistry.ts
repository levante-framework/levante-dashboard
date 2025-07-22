import { RouteRecordRaw } from 'vue-router';
import { pageTitlesEN, pageTitlesUS, pageTitlesES, pageTitlesCO } from '@/translations/exports';

// Define route configurations
interface RouteConfig {
  name: string;
  path: string;
  component: string;
  meta?: {
    requireAdmin?: boolean;
    requireSuperAdmin?: boolean;
    project?: 'ALL' | 'LEVANTE' | 'ROAR';
    pageTitle?: string | Record<string, string>;
  };
  props?: boolean | Record<string, any>;
  children?: RouteConfig[];
}

// Route registry - centralized configuration
export const routeRegistry: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    component: '@/pages/HomeSelector.vue',
    meta: {
      pageTitle: {
        'en-US': pageTitlesUS['home'],
        en: pageTitlesEN['home'],
        es: pageTitlesES['home'],
        'es-CO': pageTitlesCO['home'],
      },
    },
  },
  {
    name: 'SignIn',
    path: '/signin',
    component: '@/pages/SignIn.vue',
    meta: {
      pageTitle: {
        'en-US': pageTitlesUS['signIn'],
        en: pageTitlesEN['signIn'],
        es: pageTitlesES['signIn'],
        'es-CO': pageTitlesCO['signIn'],
      },
    },
  },
  {
    name: 'Debug',
    path: '/debug',
    component: '@/pages/Debug.vue',
    meta: { pageTitle: 'Debug Information' },
  },
  {
    name: 'Maintenance',
    path: '/maintenance',
    component: '@/pages/MaintenancePage.vue',
    meta: { pageTitle: 'Down for Maintenance' },
  },
  {
    name: 'AuthEmailLink',
    path: '/auth-email-link',
    component: '@/components/auth/AuthEmailLink.vue',
    meta: { pageTitle: 'Email Link Authentication' },
  },
  {
    name: 'AuthEmailSent',
    path: '/auth-email-sent',
    component: '@/components/auth/AuthEmailSent.vue',
    meta: { pageTitle: 'Authentication Email Sent' },
  },
  {
    name: 'Administrator',
    path: '/administrator',
    component: '@/pages/HomeAdministrator.vue',
    meta: { pageTitle: 'Administrator', requireAdmin: true },
  },
  {
    name: 'CreateAssignment',
    path: '/create-assignment',
    component: '@/pages/CreateAssignment.vue',
    meta: { 
      pageTitle: 'Create Assignment',
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    name: 'EditAssignment',
    path: '/edit-assignment/:adminId',
    component: '@/pages/CreateAssignment.vue',
    props: true,
    meta: { 
      pageTitle: 'Edit an Assignment',
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    name: 'CreateAdministrator',
    path: '/create-administrator',
    component: '@/pages/CreateAdministrator.vue',
    meta: { 
      pageTitle: 'Create an administrator account', 
      requireAdmin: true 
    },
  },
  {
    name: 'ListGroups',
    path: '/list-groups',
    component: '@/pages/groups/ListGroups.vue',
    meta: { 
      pageTitle: 'Groups', 
      requireAdmin: true 
    },
  },
  {
    name: 'ListUsers',
    path: '/list-users/:orgType/:orgId/:orgName',
    component: '@/pages/users/ListUsers.vue',
    props: true,
    meta: { 
      pageTitle: 'List users', 
      requireAdmin: true 
    },
  },
  {
    name: 'ProgressReport',
    path: '/administration/:administrationId/:orgType/:orgId',
    component: '@/pages/ProgressReport.vue',
    props: true,
    meta: { 
      pageTitle: 'View Administration', 
      requireAdmin: true 
    },
  },
  {
    name: 'Profile',
    path: '/profile',
    component: '@/pages/AdminProfile.vue',
    meta: { pageTitle: 'Profile' },
    children: [
      {
        name: 'ProfileAccounts',
        path: 'accounts',
        component: '@/components/adminSettings/LinkAccountsView.vue',
        meta: { requireAdmin: true },
      },
      {
        name: 'ProfileSettings',
        path: 'settings',
        component: '@/components/adminSettings/Settings.vue',
      },
    ],
  },
  {
    name: 'EnableCookies',
    path: '/enable-cookies',
    component: '@/pages/EnableCookies.vue',
    meta: { pageTitle: 'Enable Cookies' },
  },
  {
    name: 'AddUsers',
    path: '/add-users',
    component: '@/pages/users/AddUsers.vue',
    meta: { 
      pageTitle: 'Add Users', 
      requireAdmin: true, 
      project: 'LEVANTE' 
    },
  },
  {
    name: 'LinkUsers',
    path: '/link-users',
    component: '@/pages/users/LinkUsers.vue',
    meta: { 
      pageTitle: 'Link Users', 
      requireAdmin: true, 
      project: 'LEVANTE' 
    },
  },
  {
    name: 'Survey',
    path: '/survey',
    component: '@/pages/UserSurvey.vue',
    meta: { 
      pageTitle: 'Survey', 
      project: 'LEVANTE' 
    },
  },
  {
    name: 'ManageTasksVariants',
    path: '/manage-tasks-variants',
    component: '@/pages/ManageTasksVariants.vue',
    meta: { 
      pageTitle: 'Manage Tasks',
      requireSuperAdmin: true,
    },
  },
  // Game routes
  {
    name: 'SWR',
    path: '/game/swr',
    component: '@/components/tasks/TaskSWR.vue',
    props: { taskId: 'swr' },
    meta: { pageTitle: 'SWR' },
  },
  {
    name: 'PA',
    path: '/game/pa',
    component: '@/components/tasks/TaskPA.vue',
    props: { taskId: 'pa' },
    meta: { pageTitle: 'PA' },
  },
  {
    name: 'SRE',
    path: '/game/sre',
    component: '@/components/tasks/TaskSRE.vue',
    props: { taskId: 'sre' },
    meta: { pageTitle: 'SRE' },
  },
  {
    name: 'CoreTasks',
    path: '/game/core-tasks/:taskId',
    component: '@/components/tasks/TaskLevante.vue',
    props: true,
    meta: { pageTitle: 'Core Tasks' },
  },
  // 404 route
  {
    name: 'NotFound',
    path: '/:pathMatch(.*)*',
    component: '@/pages/NotFound.vue',
    meta: { pageTitle: 'Whoops! 404 Page!' },
  },
];

// Convert route config to Vue Router format
function convertRouteConfig(config: RouteConfig): RouteRecordRaw {
  const route: RouteRecordRaw = {
    path: config.path,
    name: config.name,
    component: () => {
      // Handle dynamic imports with proper path resolution
      const componentPath = config.component.replace('@/', '../');
      return import(/* @vite-ignore */ componentPath);
    },
    meta: config.meta || {},
  };

  if (config.props !== undefined) {
    route.props = config.props;
  }

  if (config.children) {
    route.children = config.children.map(convertRouteConfig);
  }

  return route;
}

// Generate all routes
export function generateRoutes(): RouteRecordRaw[] {
  return routeRegistry.map(convertRouteConfig);
}

// Helper function to get route by name
export function getRouteByName(name: string): RouteConfig | undefined {
  return routeRegistry.find(route => route.name === name);
}

// Helper function to check if route exists
export function routeExists(name: string): boolean {
  return routeRegistry.some(route => route.name === name);
} 