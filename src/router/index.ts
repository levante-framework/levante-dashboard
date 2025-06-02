import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouterScrollBehavior,
} from "vue-router";
import { useAuthStore } from "@/store/auth";
import _get from "lodash/get";
import {
  pageTitlesEN,
  pageTitlesUS,
  pageTitlesES,
  pageTitlesCO,
} from "@/translations/exports";
import { isLevante } from "@/helpers";
import { APP_ROUTES } from "@/constants/routes";
import posthogInstance from "@/plugins/posthog";
import { logger } from "@/logger";

function removeQueryParams(to: RouteLocationNormalized) {
  if (Object.keys(to.query).length)
    return { path: to.path, query: {}, hash: to.hash };
}

function removeHash(to: RouteLocationNormalized) {
  if (to.hash) return { path: to.path, query: to.query, hash: "" };
}

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: () => import("../pages/HomeSelector.vue"),
    meta: {
      pageTitle: {
        "en-US": pageTitlesUS["home"],
        en: pageTitlesEN["home"],
        es: pageTitlesES["home"],
        "es-CO": pageTitlesCO["home"],
      },
    },
  },
  {
    path: "/debug",
    name: "Debug",
    component: () => import("../pages/Debug.vue"),
    meta: { pageTitle: "Debug Information" },
  },
  {
    path: "/game/swr",
    name: "SWR",
    component: () => import("../components/tasks/TaskSWR.vue"),
    props: { taskId: "swr" },
    meta: { pageTitle: "SWR" },
  },
  {
    path: "/game/pa",
    name: "PA",
    component: () => import("../components/tasks/TaskPA.vue"),
    props: { taskId: "pa" },
    meta: { pageTitle: "PA" },
  },
  {
    path: "/game/sre",
    name: "SRE",
    component: () => import("../components/tasks/TaskSRE.vue"),
    props: { taskId: "sre" },
    meta: { pageTitle: "SRE" },
  },
  {
    path: "/game/core-tasks/:taskId",
    name: "Core Tasks",
    component: () => import("../components/tasks/TaskLevante.vue"),
    props: true,
    // Add which specific task?
    // Code in App.vue overwrites updating it programmatically
    meta: { pageTitle: "Core Tasks" },
  },
  {
    path: "/manage-tasks-variants",
    name: "ManageTasksVariants",
    component: () => import("../pages/ManageTasksVariants.vue"),
    meta: {
      pageTitle: "Manage Tasks",
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    path: APP_ROUTES.SIGN_IN,
    name: "SignIn",
    component: () => import("../pages/SignIn.vue"),
    meta: {
      pageTitle: {
        "en-US": pageTitlesUS["signIn"],
        en: pageTitlesEN["signIn"],
        es: pageTitlesES["signIn"],
        "es-CO": pageTitlesCO["signIn"],
      },
    },
  },
  {
    path: "/auth-email-link",
    name: "AuthEmailLink",
    component: () => import("../components/auth/AuthEmailLink.vue"),
    meta: { pageTitle: "Email Link Authentication" },
  },
  {
    path: "/auth-email-sent",
    name: "AuthEmailSent",
    component: () => import("../components/auth/AuthEmailSent.vue"),
    meta: { pageTitle: "Authentication Email Sent" },
  },
  {
    path: "/administrator",
    name: "Administrator",
    component: () => import("../pages/HomeAdministrator.vue"),
    meta: { pageTitle: "Administrator", requireAdmin: true },
  },
  {
    path: "/create-assignment",
    name: "CreateAssignment",
    component: () => import("../pages/CreateAssignment.vue"),
    meta: {
      pageTitle: "Create Assignment",
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    path: "/edit-assignment/:adminId",
    name: "EditAssignment",
    props: true,
    component: () => import("../pages/CreateAssignment.vue"),
    meta: {
      pageTitle: "Edit an Assignment",
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    path: "/create-administrator",
    name: "CreateAdministrator",
    component: () => import("../pages/CreateAdministrator.vue"),
    meta: { pageTitle: "Create an administrator account", requireAdmin: true },
  },
  {
    path: "/create-group",
    name: "CreateGroup",
    component: () => import("../pages/groups/CreateGroup.vue"),
    meta: {
      pageTitle: "Create a group",
      requireAdmin: true,
      requireSuperAdmin: true,
    },
  },
  {
    path: "/list-groups",
    name: "ListGroups",
    component: () => import("../pages/groups/ListGroups.vue"),
    meta: { pageTitle: "Groups", requireAdmin: true },
  },
  {
    path: "/list-users/:orgType/:orgId/:orgName",
    name: "ListUsers",
    props: true,
    component: () => import("../pages/users/ListUsers.vue"),
    meta: { pageTitle: "List users", requireAdmin: true },
  },
  {
    path: "/administration/:administrationId/:orgType/:orgId",
    name: "ProgressReport",
    props: true,
    component: () => import("../pages/ProgressReport.vue"),
    meta: { pageTitle: "View Administration", requireAdmin: true },
  },
  {
    path: APP_ROUTES.ACCOUNT_PROFILE,
    name: "Profile",
    component: () => import("../pages/AdminProfile.vue"),
    children: [
      {
        path: "",
        name: "ProfileInfo",
        component: () => import("../components/adminSettings/UserInfoView.vue"),
      },
      {
        path: "password",
        name: "ProfilePassword",
        component: () => import("../components/adminSettings/PasswordView.vue"),
        meta: { requireAdmin: true },
      },
      {
        path: "accounts",
        name: "ProfileAccounts",
        component: () =>
          import("../components/adminSettings/LinkAccountsView.vue"),
        meta: { requireAdmin: true },
      },
      {
        path: "settings",
        name: "ProfileSettings",
        component: () => import("../components/adminSettings/Settings.vue"),
      },
    ],
    meta: { pageTitle: "Profile" },
  },
  {
    path: "/enable-cookies",
    name: "EnableCookies",
    component: () => import("../pages/EnableCookies.vue"),
    meta: { pageTitle: "Enable Cookies" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../pages/NotFound.vue"),
    meta: { pageTitle: "Whoops! 404 Page!" },
  },
  {
    path: "/add-users",
    name: "Add Users",
    component: () => import("../pages/users/AddUsers.vue"),
    meta: { pageTitle: "Add Users", requireAdmin: true, project: "LEVANTE" },
  },

  {
    path: "/link-users",
    name: "Link Users",
    component: () => import("../pages/users/LinkUsers.vue"),
    meta: { pageTitle: "Link Users", requireAdmin: true, project: "LEVANTE" },
  },
  // {
  //   path: '/edit-users',
  //   name: 'Edit Users',
  //   component: () => import('../pages/users/EditUsers.vue'),
  //   meta: { pageTitle: 'Edit Users', requireAdmin: true, project: 'LEVANTE' },
  // },
  {
    path: "/survey",
    name: "Survey",
    component: () => import("../pages/UserSurvey.vue"),
    meta: { pageTitle: "Survey", project: "LEVANTE" },
  },
  {
    path: "/maintenance",
    name: "Maintenance",
    component: () => import("../pages/MaintenancePage.vue"),
    meta: { pageTitle: "Down for Maintenance" },
  },
];

const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) {
    return savedPosition;
  } else if (to.hash) {
    return {
      el: to.hash,
      behavior: "smooth",
    };
  } else {
    return { left: 0, top: 0 };
  }
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior,
});

router.beforeEach(
  async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    console.log('Router guard: Navigation from', from.name, 'to', to.name);
    
    // Don't allow routing to LEVANTE pages if not in LEVANTE instance
    if (!isLevante && to.meta?.project === "LEVANTE") {
      console.log('Router guard: Blocking navigation to LEVANTE page in non-LEVANTE instance');
      next({ name: "Home" });
      // next function can only be called once per route
      return;
    }

    const store = useAuthStore();
    console.log('Router guard: Auth store state:', {
      isAuthenticated: (store as any).isAuthenticated,
      isFirekitInit: (store as any).isFirekitInit,
      uid: (store as any).uid,
      hasFirekit: !!store.roarfirekit
    });

    const allowedUnauthenticatedRoutes = [
      "SignIn",
      "Maintenance",
      "AuthEmailLink",
      "AuthEmailSent",
      "Debug",
    ];

    const inMaintenanceMode = false;

    if (inMaintenanceMode && to.name !== "Maintenance") {
      console.log('Router guard: Redirecting to maintenance');
      next({ name: "Maintenance" });
      return;
    } else if (!inMaintenanceMode && to.name === "Maintenance") {
      console.log('Router guard: Redirecting away from maintenance');
      next({ name: "Home" });
      return false;
    }
    
    // Wait for firekit to be initialized before making authentication decisions
    if (!(store as any).isFirekitInit) {
      console.log('Router guard: Firekit not initialized, waiting...');
      
      // Wait for firekit initialization with timeout
      let attempts = 0;
      while (!(store as any).isFirekitInit && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!(store as any).isFirekitInit) {
        console.warn('Router guard: Firekit initialization timeout, proceeding with current state');
      } else {
        console.log('Router guard: Firekit initialized after waiting');
      }
    }
    
    // Check if user is signed in. If not, go to signin
    if (
      !to.path.includes("__/auth/handler") &&
      !(store as any).isAuthenticated &&
      !allowedUnauthenticatedRoutes.includes(to.name as string)
    ) {
      console.log('Router guard: User not authenticated, redirecting to SignIn');
      next({ name: "SignIn" });
      return;
    }

    // Check if the route requires admin rights and the user is an admin.
    const requiresAdmin = _get(to, "meta.requireAdmin", false);
    const requiresSuperAdmin = _get(to, "meta.requireSuperAdmin", false);

    // Check user roles
    const isUserAdmin = (store as any).isUserAdmin;
    const isUserSuperAdmin = (store as any).isUserSuperAdmin;
    
    console.log('Router guard: Role check:', {
      requiresAdmin,
      requiresSuperAdmin,
      isUserAdmin,
      isUserSuperAdmin
    });

    // All current conditions:
    // 1. Super Admin: true, Admin: true
    // 2. Super Admin: false, Admin: true (Only exits because requiresSuperAdmin is not defined on every route)
    // 3. Super Admin: false, Admin: false (Allowed routes for all users)
    // (Also exists because requiresAdmin/requiresSuperAdmin is not defined on every route)

    if (isUserSuperAdmin) {
      console.log('Router guard: Super admin access granted');
      next();
      return;
    } else if (isUserAdmin) {
      // LEVANTE dashboard has opened some pages to administrators before the ROAR dashboard
      // So if isLevante, then allow regular admins to access any route with requireAdmin = true.
      // and if ROAR, then prohibit regular admins from accessing any route with requireSuperAdmin = true.
      if (isLevante && requiresAdmin) {
        console.log('Router guard: LEVANTE admin access granted');
        next();
        return;
      } else if (requiresSuperAdmin) {
        console.log('Router guard: Super admin required, redirecting to home');
        next({ name: "Home" });
        return;
      }
      console.log('Router guard: Admin access granted');
      next();
      return;
    }

    // If we get here, the user is a regular user
    if (requiresSuperAdmin || requiresAdmin) {
      console.log('Router guard: Admin access required, redirecting to home');
      next({ name: "Home" });
      return;
    }

    console.log('Router guard: Regular user access granted');
    next();
    return;
  },
);

// PostHog pageview tracking
router.afterEach((to, from) => {
  logger.capture("pageview", { to, from });
});

export default router;
