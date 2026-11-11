import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import { LOGOUT_MUTATION_KEY } from '@/constants/mutationKeys';
import { APP_ROUTES } from '@/constants/routes';
import { useAssignmentsStore } from '@/store/assignments';
import { useAuthStore } from '@/store/auth';
import { useLevanteStore } from '@/store/levante';
import { useSurveyStore } from '@/store/survey';

/**
 * Logout mutation.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useLogoutMutation = (): UseMutationReturnType<void, Error, void, unknown> => {
  const assignmentsStore = useAssignmentsStore();
  const authStore = useAuthStore();
  const levanteStore = useLevanteStore();
  const surveyStore = useSurveyStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: LOGOUT_MUTATION_KEY,
    mutationFn: async (): Promise<void> => {
      // Finish Firebase sign-out before onSettled clears session state and redirects.
      // Navigating in parallel lets the next login succeed, then get signed out by this call.
      await authStore.logout();
    },
    meta: {
      errorMessage: 'Failed to log out',
      errorContext: {
        tags: { composable: 'useLogoutMutation' },
      },
    },
    // Use onSettled (not onSuccess) so a failed Firebase sign-out still tears down the local
    // session and redirects. Otherwise the user stays on an authenticated screen with no way back
    // to login (e.g. after refusing consent, where the dialog has already closed). The sign-out
    // failure itself is still reported to Sentry via meta.errorMessage.
    onSettled: async (): Promise<void> => {
      // Cancel all actively fetching queries.
      await queryClient.cancelQueries();

      // Reset store and delete persisted data. Persisted data should be cleared via the $reset but to be safe, we also
      // remove it manually from sessionStorage to prevent any issues.
      assignmentsStore.$reset();
      authStore.$reset();
      assignmentsStore.$reset();
      levanteStore.$reset();
      surveyStore.reset();
      sessionStorage.removeItem('authStore');
      sessionStorage.removeItem('assignmentsStore');

      // Clear the query client to remove all cached data.
      queryClient.clear();

      // Re-initialize Firekit. This is necessary to ensure that Firekit is properly reset after
      // logout in order to allow a new user to log in.
      await authStore.initFirekit();

      // Redirect to login page.
      router.push({ path: APP_ROUTES.LOGIN });
    },
  });
};

export default useLogoutMutation;
