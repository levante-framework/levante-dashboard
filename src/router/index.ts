import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import _get from 'lodash/get';
import { pageTitlesEN, pageTitlesUS, pageTitlesES, pageTitlesCO } from '@/translations/exports';
import { isLevante } from '@/helpers';
import { APP_ROUTES } from '@/constants/routes';
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import _isEmpty from 'lodash/isEmpty';
import _union from 'lodash/union';

interface RouteMeta {
  pageTitle?: string | Record<string, string>;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requiresGuest?: boolean;
  project?: string;
  toTop?: boolean;
  smoothScroll?: boolean;
}

type Route = RouteRecordRaw & {
  meta?: RouteMeta;
  beforeRouteLeave?: ((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => void)[];
};

function removeQueryParams(to: RouteLocationNormalized) {
  if (Object.keys(to.query).length) return { path: to.path, query: {}, hash: to.hash };
}

function removeHash(to: RouteLocationNormalized) {
  if (to.hash) return { path: to.path, query: to.query, hash: '' };
}

const routes: Route[] = [
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
    meta: { pageTitle: 'SWR' },
  },
  {
    path: '/game/swr-es',
    name: 'SWR-ES',
    component: () => import('../components/tasks/TaskSWR.vue'),
    props: { taskId: 'swr-es', language: 'es' },
    meta: { pageTitle: 'SWR (ES)' },
  },
  {
    path: '/game/swr-de',
    name: 'SWR-DE',
    component: () => import('../components/tasks/TaskSWR.vue'),
    props: { taskId: 'swr-de', language: 'de' },
    meta: { pageTitle: 'SWR (DE)' },
  },
  {
    path: '/game/pa',
    name: 'PA',
    component: () => import('../components/tasks/TaskPA.vue'),
    props: { taskId: 'pa', language: 'en' },
    meta: { pageTitle: 'PA' },
  },
  {
    path: '/game/pa-es',
    name: 'PA-ES',
    component: () => import('../components/tasks/TaskPA.vue'),
    props: { taskId: 'pa-es', language: 'es' },
    meta: { pageTitle: 'PA-ES' },
  },
  {
    path: '/game/pa-de',
    name: 'PA-DE',
    component: () => import('../components/tasks/TaskPA.vue'),
    props: { taskId: 'pa-de', language: 'de' },
    meta: { pageTitle: 'PA-DE' },
  },
  {
    path: '/game/sre',
    name: 'SRE',
    component: () => import('../components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre', language: 'en' },
    meta: { pageTitle: 'SRE' },
  },
  {
    path: '/game/sre-es',
    name: 'SRE-ES',
    component: () => import('../components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre-es', language: 'es' },
    meta: { pageTitle: 'SRE-ES' },
  },
  {
    path: '/game/sre-de',
    name: 'SRE-DE',
    component: () => import('../components/tasks/TaskSRE.vue'),
    props: { taskId: 'sre-de', language: 'de' },
    meta: { pageTitle: 'SRE-DE' },
  },
  {
    path: '/game/core-tasks/:taskId',
    name: 'Core Tasks',
    component: () => import('../components/tasks/TaskLevante.vue'),
    props: true,
    meta: { pageTitle: 'Core Tasks' },
  },
  {
    path: '/manage-tasks-variants',
    name: 'ManageTasksVariants',
    component: () => import('../pages/ManageTasksVariants.vue'),
    meta: { pageTitle: 'Manage Tasks', requireAdmin: true, requireSuperAdmin: true },
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
    meta: { pageTitle: 'Register Students', requireAdmin: true, requireSuperAdmin: true },
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
    props: (route) => ({ code: route.query.code }),
    meta: { pageTitle: 'Signing you in…' },
  },
  {
    path: '/auth-clever',
    name: 'AuthClever',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../components/auth/AuthClever.vue'),
    props: (route) => ({ code: route.query.code }),
    meta: { pageTitle: 'Clever Authentication' },
  },
  {
    path: '/auth-classlink',
    name: 'AuthClassLink',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../components/auth/AuthClassLink.vue'),
    props: (route) => ({ code: route.query.code }),
    meta: { pageTitle: 'ClassLink Authentication' },
  },
  {
    path: '/auth-email-link',
    name: 'AuthEmailLink',
    beforeRouteLeave: [removeQueryParams, removeHash],
    component: () => import('../components/auth/AuthEmailLink.vue'),
    meta: { pageTitle: 'Email Link Authentication' },
  },
  {
    path: '/auth-email-sent',
    name: 'AuthEmailSent',
    component: () => import('../components/auth/AuthEmailSent.vue'),
    meta: { pageTitle: 'Authentication Email Sent' },
  },
  {
    path: '/administrator',
    name: 'Administrator',
    component: () => import('../pages/HomeAdministrator.vue'),
    meta: { pageTitle: 'Administrator', requireAdmin: true },
  },
  {
    path: '/create-administration',
    name: 'CreateAdministration',
    component: () => import('../components/CreateAdministration.vue'),
    meta: { pageTitle: 'Create an administration', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/edit-administration/:adminId',
    name: 'EditAdministration',
    props: true,
    component: () => import('../components/CreateAdministration.vue'),
    meta: { pageTitle: 'Edit an Administration', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/create-administrator',
    name: 'CreateAdministrator',
    component: () => import('../components/CreateAdministrator.vue'),
    meta: { pageTitle: 'Create an administrator account', requireAdmin: true },
  },
  {
    path: '/create-audience',
    name: 'CreateAudience',
    component: () => import('../components/CreateAudience.vue'),
    meta: { pageTitle: 'Create an audience', requireAdmin: true, requireSuperAdmin: true },
  },
  {
    path: '/list-audiences',
    name: 'ListAudiences',
    component: () => import('../components/ListAudiences.vue'),
    meta: { pageTitle: 'Audiences', requireAdmin: true },
  },
  {
    path: '/list-users/:orgType/:orgId/:orgName',
    name: 'ListUsers',
    props: true,
    component: () => import('../components/ListUsers.vue'),
    meta: { pageTitle: 'List users', requireAdmin: true },
  },
  {
    path: '/administration/:administrationId/:orgType/:orgId',
    name: 'ProgressReport',
    props: true,
    component: () => import('../pages/ProgressReport.vue'),
    meta: { pageTitle: 'View Administration', requireAdmin: true },
  },
  {
    path: APP_ROUTES.SCORE_REPORT,
    name: 'ScoreReport',
    props: true,
    component: () => import('../pages/ScoreReport.vue'),
    meta: { pageTitle: 'View Scores', requireAdmin: true },
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
    meta: { pageTitle: 'Profile' },
  },
  {
    path: '/enable-cookies',
    name: 'EnableCookies',
    component: () => import('../pages/EnableCookies.vue'),
    meta: { pageTitle: 'Enable Cookies' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.vue'),
    meta: { pageTitle: 'Whoops! 404 Page!' },
  },
  // LEVANTE
  {
    path: '/add-users',
    name: 'Add Users',
    component: () => import('../pages/LEVANTE/AddUsers.vue'),
    meta: { pageTitle: 'Add Users', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/sync-passwords',
    name: 'Sync Passwords',
    component: () => import('../pages/LEVANTE/SyncPasswords.vue'),
    meta: { pageTitle: 'Sync Passwords', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/link-users',
    name: 'Link Users',
    component: () => import('../pages/LEVANTE/LinkUsers.vue'),
    meta: { pageTitle: 'Link Users', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/edit-users',
    name: 'Edit Users',
    component: () => import('../pages/LEVANTE/EditUsers.vue'),
    meta: { pageTitle: 'Edit Users', requireAdmin: true, project: 'LEVANTE' },
  },
  {
    path: '/survey',
    name: 'Survey',
    component: () => import('../pages/LEVANTE/UserSurvey.vue'),
    meta: { pageTitle: 'Survey', project: 'LEVANTE' },
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('../pages/MaintenancePage.vue'),
    meta: { pageTitle: 'Down for Maintenance' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    const scroll: { top?: number; behavior?: 'smooth' } = {};
    if (to.meta.toTop) scroll.top = 0;
    if (to.meta.smoothScroll) scroll.behavior = 'smooth';
    return scroll;
  },
});

// Centralized flag to prevent multiple concurrent waits
let isWaitingForAuthReady = false;

// Navigation Guard
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): Promise<void> => {
    // Get store instance inside the guard
    const authStore = useAuthStore(); 
    // IMPORTANT: Access state directly here for the initial check, 
    // refs might not be ready yet.

    console.log(`[RouterGuard] Navigating TO: ${to.name?.toString()} FROM: ${from.name?.toString()}`);

    // --- Wait for Auth Store Readiness --- 
    if (!authStore.isReady && !isWaitingForAuthReady && to.name !== 'SignIn' && to.name !== 'Register') { 
        console.log('[RouterGuard] AuthStore not ready yet (direct check). Waiting using loop...');
        isWaitingForAuthReady = true; 
        
        let waitCycles = 0;
        const maxWaitCycles = 200; // Approx 10 seconds
        // Check direct state in the loop
        while (!authStore.isReady && waitCycles < maxWaitCycles) {
          waitCycles++;
          console.log(`[RouterGuard] Waiting... Cycle: ${waitCycles}. Store ready: ${authStore.isReady}`);
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }

        isWaitingForAuthReady = false; 

        if (!authStore.isReady) {
             console.error('[RouterGuard] Wait timed out. AuthStore never became ready.');
             next({ name: 'SignIn' });
             return;
        } else {
             console.log('[RouterGuard] AuthStore became ready after wait loop. Proceeding.');
        }
    } 
    // --- End Wait --- 

    // Now that the store should be ready, get reactive refs
    const { isAuthenticated, userClaims, adminOrgs } = storeToRefs(authStore);

    // --- Add check if store is STILL not ready (extra safety) ---
    if (!authStore.isReady && to.name !== 'SignIn' && to.name !== 'Register') {
      console.error('[RouterGuard] Double check failed: AuthStore not ready. Redirecting to SignIn.');
      next({ name: 'SignIn' });
      return; 
    }
    // ---------------------------------------------------------------------

    console.log(`[RouterGuard] Checking auth: isAuthenticated = ${isAuthenticated.value}`);

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
    const requiresSuperAdmin = to.matched.some((record) => record.meta.requiresSuperAdmin);

    // Permission checks - use .value for refs from storeToRefs
    if (requiresAuth && !isAuthenticated.value) {
        console.log(`[RouterGuard] Not authenticated for restricted route ${to.name?.toString()}. Redirecting to SignIn.`);
        next({ name: 'SignIn' });
    } else if (requiresSuperAdmin) {
      console.log(`[RouterGuard] Route meta: requiresAdmin=${requiresAdmin}, requiresSuperAdmin=${requiresSuperAdmin}`);
      const isSuperAdmin = userClaims.value?.claims?.super_admin ?? false;
      console.log(`[RouterGuard] User permissions: isSuperAdmin=${isSuperAdmin}`);
      if (!isSuperAdmin) {
        console.log(`[RouterGuard] User lacks Super Admin permission for route ${to.name?.toString()}. Redirecting to Home.`);
        next({ name: 'Home' }); 
      } else {
         console.log('[RouterGuard] Super Admin access confirmed. Allowing navigation.');
        next(); 
      }
    } else if (requiresAdmin) {
      console.log(`[RouterGuard] Route meta: requiresAdmin=${requiresAdmin}, requiresSuperAdmin=${requiresSuperAdmin}`);
      const isSuper = userClaims.value?.claims?.super_admin ?? false;
      const isAdmin = userClaims.value?.claims?.admin ?? false;
      const hasMinAdminOrgs = !_isEmpty(_union(...Object.values(userClaims.value?.claims?.minimalAdminOrgs ?? {})));
      const userIsAdmin = isSuper || isAdmin || hasMinAdminOrgs;
      console.log(`[RouterGuard] User permissions: isAdmin=${userIsAdmin}, isSuperAdmin=${isSuper}`);
      if (!userIsAdmin) {
        console.log(`[RouterGuard] User lacks Admin permission for route ${to.name?.toString()}. Redirecting to Home.`);
        next({ name: 'Home' }); 
      } else if (isLevante && !isSuper) {
          const userAdminOrgs = adminOrgs.value;
          if (!userAdminOrgs || userAdminOrgs.length === 0) {
              console.log(`[RouterGuard] Levante Admin has no assigned orgs. Redirecting to Profile.`);
              next({ name: 'AdminProfile' });
          } else {
              console.log('[RouterGuard] Levante Admin access confirmed. Allowing navigation.');
              next();
          }
      } else {
        console.log('[RouterGuard] Admin access confirmed. Allowing navigation.');
        next();
      }
    } else {
      console.log('[RouterGuard] No specific permissions required or already handled. Allowing navigation.');
      next(); 
    }
  },
);

export default router; 