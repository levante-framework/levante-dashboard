import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouterScrollBehavior,
} from 'vue-router';
import { useAuthStore } from '@/store/auth';
import _get from 'lodash/get';
import { pageTitlesEN, pageTitlesUS, pageTitlesES, pageTitlesCO } from '@/translations/exports';
import { isLevante } from '@/helpers';
import { APP_ROUTES } from '@/constants/routes';
import { logger } from '@/logger';

// Helper functions for route cleanup
function removeQueryParams(to: RouteLocationNormalized) {
  if (Object.keys(to.query).length) return { path: to.path, query: {}, hash: to.hash };
}

function removeHash(to: RouteLocationNormalized) {
  if (to.hash) return { path: to.path, query: to.query, hash: '' };
}

// Define all routes in a clean, organized way
const routes: Array<RouteRecordRaw> = [
  // Public routes
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomeSelector.vue'),
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
    path: '/signin',
    name: 'SignIn',
    component: () => import('@/pages/SignIn.vue'),
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
    path: '/debug',
    name: 'Debug',
    component: () => import('@/pages/Debug.vue'),
    meta: { pageTitle: 'Debug Information' },
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('@/pages/MaintenancePage.vue'),
    meta: { pageTitle: 'Down for Maintenance' },
  },
  {
    path: '/auth-email-link',
    name: 'AuthEmailLink',
    component: () => import('@/components/auth/AuthEmailLink.vue'),
    meta: { pageTitle: 'Email Link Authentication' },
  },
  {
    path: '/auth-email-sent',
    name: 'AuthEmailSent',
    component: () => import('@/components/auth/AuthEmailSent.vue'),
    meta: { pageTitle: 'Authentication Email Sent' },
  },
  {
    path: '/enable-cookies',
    name: 'EnableCookies',
    component: () => import('@/pages/EnableCookies.vue'),
    meta: { pageTitle: 'Enable Cookies' },
  },

  // Admin routes
  {
    path: '/administrator',
    name: 'Administrator',
    component: () => import('@/pages/HomeAdministrator.vue'),
    meta: { pageTitle: 'Administrator', requireAdmin: true },
  },
  {
    path: '/create-assignment',
    name: 'CreateAssignment',
    component: () => import('@/pages/CreateAssignment.vue'),
    meta: { 
      pageTitle: 'Create Assignment',
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    path: '/edit-assignment/:adminId',
    name: 'EditAssignment',
    props: true,
    component: () => import('@/pages/CreateAssignment.vue'),
    meta: { 
      pageTitle: 'Edit an Assignment',
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    path: '/create-administrator',
    name: 'CreateAdministrator',
    component: () => import('@/pages/CreateAdministrator.vue'),
    meta: { 
      pageTitle: 'Create an administrator account', 
      requireAdmin: true 
    },
  },
  {
    path: '/list-groups',
    name: 'ListGroups',
    component: () => import('@/pages/groups/ListGroups.vue'),
    meta: { 
      pageTitle: 'Groups', 
      requireAdmin: true 
    },
  },
  {
    path: '/list-users/:orgType/:orgId/:orgName',
    name: 'ListUsers',
    props: true,
    component: () => import('@/pages/users/ListUsers.vue'),
    meta: { 
      pageTitle: 'List users', 
      requireAdmin: true 
    },
  },
  {
    path: '/administration/:administrationId/:orgType/:orgId',
    name: 'ProgressReport',
    props: true,
    component: () => import('@/pages/ProgressReport.vue'),
    meta: { 
      pageTitle: 'View Administration', 
      requireAdmin: true 
    },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/AdminProfile.vue'),
    children: [
      {
        path: 'accounts',
        name: 'ProfileAccounts',
        component: () => import('@/components/adminSettings/LinkAccountsView.vue'),
        meta: { requireAdmin: true },
      },
      {
        path: 'settings',
        name: 'ProfileSettings',
        component: () => import('@/components/adminSettings/Settings.vue'),
      },
    ],
    meta: { pageTitle: 'Profile' },
  },
  {
    path: '/manage-tasks-variants',
    name: 'ManageTasksVariants',
    component: () => import('@/pages/ManageTasksVariants.vue'),
    meta: { 
      pageTitle: 'Manage Tasks',
      requireSuperAdmin: true,
    },
  },

  // LEVANTE-specific routes
  {
    path: '/add-users',
    name: 'AddUsers',
    component: () => import('@/pages/users/AddUsers.vue'),
    meta: { 
      pageTitle: 'Add Users', 
      requireAdmin: true, 
      project: 'LEVANTE' 
    },
  },
  {
    path: '/link-users',
    name: 'LinkUsers',
    component: () => import('@/pages/users/LinkUsers.vue'),
    meta: { 
      pageTitle: 'Link Users', 
      requireAdmin: true, 
      project: 'LEVANTE' 
    },
  },
  {
    path: '/survey',
    name: 'Survey',
    component: () => import('@/pages/UserSurvey.vue'),
    meta: { 
      pageTitle: 'Survey', 
      project: 'LEVANTE' 
    },
  },

  // Game routes
  {
    path: '/game/swr',
    name: 'SWR',
    component: () => import('@/components/tasks/TaskSWR.vue'),
    props: { taskId: 'swr' },
    meta: { pageTitle: 'SWR' },
  },
  {
    path: '/game/pa',
    name: 'PA',
    component: () => import('@/components/tasks/TaskPA.vue'),
    props: { taskId: 'pa' },
    meta: { pageTitle: 'PA' },
  },
  {
    path: '/game/sre',
    name: 'SRE',
    component: () => import('@/components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre' },
    meta: { pageTitle: 'SRE' },
  },
  {
    path: '/game/core-tasks/:taskId',
    name: 'CoreTasks',
    component: () => import('@/components/tasks/TaskLevante.vue'),
    props: true,
    meta: { pageTitle: 'Core Tasks' },
  },

  // 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFound.vue'),
    meta: { pageTitle: 'Whoops! 404 Page!' },
  },
];

// Scroll behavior
const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) {
    return savedPosition;
  } else if (to.hash) {
    return {
      el: to.hash,
      behavior: 'smooth',
    };
  } else {
    return { left: 0, top: 0 };
  }
};

// Create router
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior,
});

// Navigation guards
router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // Don't allow routing to LEVANTE pages if not in LEVANTE instance
  if (!isLevante && to.meta?.project === 'LEVANTE') {
    next({ name: 'Home' });
    return;
  }

  const store = useAuthStore();
  const allowedUnauthenticatedRoutes = ['SignIn', 'Maintenance', 'AuthEmailLink', 'AuthEmailSent', 'Debug'];

  // Maintenance mode check
  const inMaintenanceMode = false;
  if (inMaintenanceMode && to.name !== 'Maintenance') {
    next({ name: 'Maintenance' });
    return;
  } else if (inMaintenanceMode && to.name === 'Maintenance') {
    next({ name: 'Home' });
    return;
  }

  // Authentication check
  if (
    !to.path.includes('__/auth/handler') &&
    !(store as any).isAuthenticated &&
    !allowedUnauthenticatedRoutes.includes(to.name as string)
  ) {
    next({ name: 'SignIn' });
    return;
  }

  // Authorization check
  const requiresAdmin = _get(to, 'meta.requireAdmin', false);
  const requiresSuperAdmin = _get(to, 'meta.requireSuperAdmin', false);

  const isUserAdmin = (store as any).isUserAdmin;
  const isUserSuperAdmin = (store as any).isUserSuperAdmin;

  if (isUserSuperAdmin) {
    next();
    return;
  } else if (isUserAdmin) {
    if (isLevante && requiresAdmin) {
      next();
      return;
    } else if (requiresSuperAdmin) {
      next({ name: 'Home' });
      return;
    }
    next();
    return;
  }

  // Regular user access
  if (requiresSuperAdmin || requiresAdmin) {
    next({ name: 'Home' });
    return;
  }

  next();
});

// PostHog pageview tracking
router.afterEach((to, from) => {
  logger.capture('pageview', { to, from });
});

export default router;
