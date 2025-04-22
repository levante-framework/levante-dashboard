import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import type { Router } from 'vue-router';
import * as Sentry from '@sentry/vue';
import { useAuthStore } from '@/store/auth';
import { SIGN_OUT_MUTATION_KEY } from '@/constants/mutationKeys';
import { APP_ROUTES } from '@/constants/routes';
import { useSurveyStore } from '@/store/survey';
import { useGameStore } from '@/store/game';

/**
 * Sign-Out mutation.
 *
 * @returns The mutation object returned by `useMutation`.
 */
// Define the return type explicitly, noting it takes no variables (void)
const useSignOutMutation = (): UseMutationReturnType<void, Error, void, unknown> => {
  const authStore = useAuthStore();
  const surveyStore = useSurveyStore();
  const gameStore = useGameStore();
  const router: Router = useRouter();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, void, unknown>({
    mutationKey: [SIGN_OUT_MUTATION_KEY], // Wrap key in array
    mutationFn: async (): Promise<void> => {
       if (!authStore.isFirekitInit || !authStore.roarfirekit) {
           // Although sign out might work without init, it's safer to check
           console.warn('Roarfirekit might not be initialized during sign out.');
           // Depending on roarfirekit behavior, you might throw or attempt sign out anyway
           // throw new Error('Roarfirekit is not initialized. Cannot sign out.');
       }
       // Assuming signOut exists and is async
      await authStore.roarfirekit?.signOut(); 
    },
    onSuccess: async () => {
      // Cancel all actively fetching queries.
      await queryClient.cancelQueries();

      // Reset store and delete persisted data.
      authStore.$reset();
      gameStore.$reset();
      surveyStore.$reset();
      // sessionStorage interaction is a side effect, types are standard DOM APIs
      sessionStorage.removeItem('authStore');
      sessionStorage.removeItem('surveyStore');
      sessionStorage.removeItem('gameStore');

      // Clear the query client to remove all cached data.
      queryClient.clear();

      // Re-initialize Firekit.
      await authStore.initFirekit();

      // Redirect to sign-in page.
      // Use router.push with typed route object if possible, or ensure APP_ROUTES.SIGN_IN is correct path string
      await router.push({ path: APP_ROUTES.SIGN_IN });
    },
    onError: (err: Error) => {
      // Assuming err is of type Error
      Sentry.captureException(err);
       console.error('Error during sign out:', err);
    },
  });
};

export default useSignOutMutation; 