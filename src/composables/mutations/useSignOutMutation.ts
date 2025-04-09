import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useRouter, type Router } from 'vue-router';
import * as Sentry from '@sentry/vue';
import { useAuthStore } from '@/store/auth';
import { SIGN_OUT_MUTATION_KEY } from '@/constants/mutationKeys';
import { APP_ROUTES } from '@/constants/routes';
import { useSurveyStore } from '@/store/survey';
import { useGameStore } from '@/store/game';

// Type for variables (none needed for sign out)
type SignOutVariables = void;
// Type for context (none needed)
type SignOutContext = void;

/**
 * Sign-Out mutation.
 *
 * @returns {UseMutationReturnType<void, Error, SignOutVariables, SignOutContext>} The mutation object returned by `useMutation`.
 */
const useSignOutMutation = (): UseMutationReturnType<void, Error, SignOutVariables, SignOutContext> => {
  const authStore = useAuthStore();
  const surveyStore = useSurveyStore();
  const gameStore = useGameStore();
  const router: Router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<void, Error, SignOutVariables, SignOutContext>({
    mutationKey: [SIGN_OUT_MUTATION_KEY],
    mutationFn: async (): Promise<void> => {
      if (!authStore.roarfirekit?.signOut) {
        throw new Error('Roarfirekit not initialized or signOut method missing.');
      }
      await authStore.roarfirekit.signOut();
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.cancelQueries();

      authStore.$reset();
      gameStore.$reset();
      surveyStore.$reset();
      sessionStorage.removeItem('authStore');
      sessionStorage.removeItem('surveyStore');
      sessionStorage.removeItem('gameStore');

      queryClient.clear();

      await authStore.initFirekit();

      await router.push({ path: APP_ROUTES.SIGN_IN });
    },
    onError: (err: Error, variables, context) => {
      console.error('[useSignOutMutation] Sign out failed:', err);
      Sentry.captureException(err);
    },
  });
};

export default useSignOutMutation;
