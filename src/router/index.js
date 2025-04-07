import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import _get from 'lodash/get';
import { pageTitlesEN, pageTitlesUS, pageTitlesES, pageTitlesCO } from '@/translations/exports';
import { isLevante } from '@/helpers';
import { APP_ROUTES } from '@/constants/routes';

function removeQueryParams(to) {
  if (Object.keys(to.query).length) return { path: to.path, query: {}, hash: to.hash };
}

function removeHash(to) {
  if (to.hash) return { path: to.path, query: to.query, hash: '' };
}

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomeSelector.vue'),
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
    path: '/game/swr',
    name: 'SWR',
    component: () => import('../components/tasks/TaskSWR.vue'),
    props: { taskId: 'swr', language: 'en' },
    meta: { pageTitle: 'Levante - SWR' },
  },
  {
    path: '/game/swr-es',
    name: 'SWR-ES',
    component: () => import('../components/tasks/TaskSWR.vue'),
    props: { taskId: 'swr-es', language: 'es' },
    meta: { pageTitle: 'Levante - SWR (ES)' },
  },
  {
    path: '/game/swr-de',
    name: 'SWR-DE',
    component: () => import('../components/tasks/TaskSWR.vue'),
    props: { taskId: 'swr-de', language: 'de' },
    meta: { pageTitle: 'Levante - SWR (DE)' },
  },
  {
    path: '/game/pa',
    name: 'PA',
    component: () => import('../components/tasks/TaskPA.vue'),
    props: { taskId: 'pa', language: 'en' },
    meta: { pageTitle: 'Levante - PA' },
  },
  {
    path: '/game/pa-es',
    name: 'PA-ES',
    component: () => import('../components/tasks/TaskPA.vue'),
    props: { taskId: 'pa-es', language: 'es' },
    meta: { pageTitle: 'Levante - PA-ES' },
  },
  {
    path: '/game/pa-de',
    name: 'PA-DE',
    component: () => import('../components/tasks/TaskPA.vue'),
    props: { taskId: 'pa-de', language: 'de' },
    meta: { pageTitle: 'Levante - PA-DE' },
  },
  {
    path: '/game/sre',
    name: 'SRE',
    component: () => import('../components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre', language: 'en' },
    meta: { pageTitle: 'Levante - SRE' },
  },
  {
    path: '/game/sre-es',
    name: 'SRE-ES',
    component: () => import('../components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre-es', language: 'es' },
    meta: { pageTitle: 'Levante - SRE-ES' },
  },
  {
    path: '/game/sre-de',
    name: 'SRE-DE',
    component: () => import('../components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre-de', language: 'de' },
    meta: { pageTitle: 'Levante - SRE-DE' },
  },
  {
    path: '/game/core-tasks/:taskId',
    name: 'Core Tasks',
    component: () => import('../components/tasks/TaskLevante.vue'),
    props: true,
    // Add which specific task?
    // Code in App.vue overwrites updating it programmatically
    meta: { pageTitle: 'Levante - Core Tasks' },
  },
  {
    path: '/manage-tasks-variants',
    name: 'ManageTasksVariants',
    component: () => import('../pages/ManageTasksVariants.vue'),
    meta: { pageTitle: 'Levante - Manage Tasks', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../pages/RegisterFamilyUsers.vue'),
    props: (route) => ({ code: route.query.code }),
    children: [
      {
        name: 'registerParent',
        path: '',
        component: () => import('../components/auth/RegisterParent.vue'),
      },
      {
        name: 'registerStudent',
        path: 'student',
        component: () => import('../components/auth/RegisterStudent.vue'),
      },
    ],
    meta: { requiresGuest: true },
  },
  {
    path: '/register-students',
    name: 'RegisterStudents',
    component: () => import('../pages/RegisterStudents.vue'),
    meta: { pageTitle: 'Levante - Register Students', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: APP_ROUTES.SIGN_IN,
    name: 'SignIn',
    component: () => import('../pages/SignIn.vue'),
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
    path: APP_ROUTES.SSO,
    name: 'SSO',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../pages/SSOAuthPage.vue'),
    props: (route) => ({ code: route.query.code }), // @TODO: Isn't the code processed by the sign-in page?
    meta: { pageTitle: 'Levante - Signing you in…' },
  },
  {
    path: '/auth-clever',
    name: 'AuthClever',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../components/auth/AuthClever.vue'),
    props: (route) => ({ code: route.query.code }),
    meta: { pageTitle: 'Levante - Clever Authentication' },
  },
  {
    path: '/auth-classlink',
    name: 'AuthClassLink',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../components/auth/AuthClassLink.vue'),
    props: (route) => ({ code: route.query.code }),
    meta: { pageTitle: 'Levante - ClassLink Authentication' },
  },
  {
    path: '/auth-email-link',
    name: 'AuthEmailLink',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../components/auth/AuthEmailLink.vue'),
    meta: { pageTitle: 'Levante - Email Link Authentication' },
  },
  {
    path: '/auth-email-sent',
    name: 'AuthEmailSent',
    component: () => import('../components/auth/AuthEmailSent.vue'),
    meta: { pageTitle: 'Levante - Authentication Email Sent' },
  },
  {
    path: '/administrator',
    name: 'Administrator',
    component: () => import('../pages/HomeAdministrator.vue'),
    meta: { pageTitle: 'Levante - Administrator', requireAdmin: true },
  },
  {
    path: '/create-administration',
    name: 'CreateAdministration',
    component: () => import('../components/CreateAdministration.vue'),
    meta: { pageTitle: 'Levante - Create an administration', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/edit-administration/:adminId',
    name: 'EditAdministration',
    props: true,
    component: () => import('../components/CreateAdministration.vue'),
    meta: { pageTitle: 'Levante - Edit an Administration', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/create-administrator',
    name: 'CreateAdministrator',
    component: () => import('../components/CreateAdministrator.vue'),
    meta: { pageTitle: 'Levante - Create an administrator account', requireAdmin: true },
  },
  {
    path: '/create-audience',
    name: 'CreateAudience',
    component: () => import('../components/CreateAudience.vue'),
    meta: { pageTitle: 'Levante - Create an audience', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/list-audiences',
    name: 'ListAudiences',
    component: () => import('../components/ListAudiences.vue'),
    meta: { pageTitle: 'Levante - Audiences', requireAdmin: true },
  },
  {
    path: '/list-users/:orgType/:orgId/:orgName',
    name: 'ListUsers',
    props: true,
    component: () => import('../components/ListUsers.vue'),
    meta: { pageTitle: 'Levante - List users', requireAdmin: true },
  },
  {
    path: '/administration/:administrationId/:orgType/:orgId',
    name: 'ProgressReport',
    props: true,
    component: () => import('../pages/ProgressReport.vue'),
    meta: { pageTitle: 'Levante - View Administration', requireAdmin: true },
  },
  {
    path: APP_ROUTES.SCORE_REPORT,
    name: 'ScoreReport',
    props: true,
    component: () => import('../pages/ScoreReport.vue'),
    meta: { pageTitle: 'Levante - View Scores', requireAdmin: true },
  },
  {
    path: APP_ROUTES.ACCOUNT_PROFILE,
    name: 'Profile',
    component: () => import('../pages/AdminProfile.vue'),
    children: [
      {
        path: '',
        name: 'ProfileInfo',
        component: () => import('../components/views/UserInfoView.vue'),
      },
      {
        path: 'password',
        name: 'ProfilePassword',
        component: () => import('../components/views/PasswordView.vue'),
        meta: { requireAdmin: true },
      },
      {
        path: 'accounts',
        name: 'ProfileAccounts',
        component: () => import('../components/views/LinkAccountsView.vue'),
        meta: { requireAdmin: true },
      },
      {
        path: 'settings',
        name: 'ProfileSettings',
        component: () => import('../components/views/Settings.vue'),
      },
    ],
    meta: { pageTitle: 'Levante - Profile' },
  },
  {
    path: '/enable-cookies',
    name: 'EnableCookies',
    component: () => import('../pages/EnableCookies.vue'),
    meta: { pageTitle: 'Levante - Enable Cookies' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.vue'),
    meta: { pageTitle: 'Levante - Whoops! 404 Page!' },
  },
  // LEVANTE
  {
    path: '/add-users',
    name: 'Add Users',
    component: () => import('../pages/LEVANTE/AddUsers.vue'),
    meta: { pageTitle: 'Levante - Add Users', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/sync-passwords',
    name: 'Sync Passwords',
    component: () => import('../pages/LEVANTE/SyncPasswords.vue'),
    meta: { pageTitle: 'Levante - Sync Passwords', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/link-users',
    name: 'Link Users',
    component: () => import('../pages/LEVANTE/LinkUsers.vue'),
    meta: { pageTitle: 'Levante - Link Users', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/edit-users',
    name: 'Edit Users',
    component: () => import('../pages/LEVANTE/EditUsers.vue'),
    meta: { pageTitle: 'Levante - Edit Users', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/survey',
    name: 'Survey',
    component: () => import('../pages/LEVANTE/UserSurvey.vue'),
    meta: { pageTitle: 'Levante - Survey', project: 'LEVANTE' },
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('../pages/MaintenancePage.vue'),
    meta: { pageTitle: 'Levante - Down for Maintenance' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    const scroll = {};
    if (to.meta.toTop) scroll.top = 0;
    if (to.meta.smoothScroll) scroll.behavior = 'smooth';
    return scroll;
  },
});

router.beforeEach(async (to, from, next) => {
  // Don't allow routing to LEVANTE pages if not in LEVANTE instance
  if (!isLevante && to.meta?.project === 'LEVANTE') {
    next({ name: 'Home' });
    // next function can only be called once per route
    return;
  }

  const store = useAuthStore();

  const allowedUnauthenticatedRoutes = [
    'SignIn',
    'SSO', //@TODO: Remove before merging
    'Maintenance',
    'AuthClever',
    'AuthClassLink',
    'AuthEmailLink',
    'AuthEmailSent',
    'Register',
  ];

  const inMaintenanceMode = false;

  if (inMaintenanceMode && to.name !== 'Maintenance') {
    next({ name: 'Maintenance' });
    return;
  } else if (!inMaintenanceMode && to.name === 'Maintenance') {
    next({ name: 'Home' });
    return false;
  }
  // Check if user is signed in. If not, go to signin
  if (
    !to.path.includes('__/auth/handler') &&
    !store.isAuthenticated &&
    !allowedUnauthenticatedRoutes.includes(to.name)
  ) {
    next({ name: 'SignIn' });
    return;
  }

  // Check if the route requires admin rights and the user is an admin.
  const requiresAdmin = _get(to, 'meta.requireAdmin', false);
  const requiresSuperAdmin = _get(to, 'meta.requireSuperAdmin', false);

  // Check user roles
  const isUserAdmin = store.isUserAdmin;
  const isUserSuperAdmin = store.isUserSuperAdmin;

  // All current conditions:
  // 1. Super Admin: true, Admin: true
  // 2. Super Admin: false, Admin: true (Only exits because requiresSuperAdmin is not defined on every route)
  // 3. Super Admin: false, Admin: false (Allowed routes for all users)
  // (Also exists because requiresAdmin/requiresSuperAdmin is not defined on every route)

  if (isUserSuperAdmin) {
    next();
    return;
  } else if (isUserAdmin) {
    // LEVANTE dashboard has opened some pages to administrators before the ROAR dashboard
    // So if isLevante, then allow regular admins to access any route with requireAdmin = true.
    // and if ROAR, then prohibit regular admins from accessing any route with requireSuperAdmin = true.
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

  // If we get here, the user is a regular user
  if (requiresSuperAdmin || requiresAdmin) {
    next({ name: 'Home' });
    return;
  }

  next();
  return;
});

export default router;
