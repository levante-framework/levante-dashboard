import { createRouter, createWebHistory } from 'vue-router'
import HomeSelector from '@/pages/HomeSelector.vue'
import SignIn from '@/pages/SignIn.vue'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/store/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeSelector,
    },
    {
      path: '/signin',
      name: 'SignIn',
      component: SignIn,
    },
    {
      path: '/surveys',
      name: 'SurveyManager',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@/views/AboutView.vue'),
    },
  ]
})

// Basic auth guard: require auth for all routes except public ones
router.beforeEach((to, _from, next) => {
  const publicPaths = new Set<string>(['/signin', '/about'])
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  if (!publicPaths.has(to.path) && !isAuthenticated) {
    return next({ path: '/signin', query: { redirect: to.fullPath } })
  }

  if (to.path === '/signin' && isAuthenticated) {
    return next({ path: '/' })
  }

  return next()
})

export default router
