import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useRouter, Router } from 'vue-router';
import * as Sentry from '@sentry/vue';
import { useAuthStore } from '@/store/auth'; // Assuming useAuthStore returns a typed store
import { SIGN_OUT_MUTATION_KEY } from '@/constants/mutationKeys';
import { APP_ROUTES } from '@/constants/routes';
import { useSurveyStore } from '@/store/survey'; // Assuming returns typed store
import { useGameStore } from '@/store/game.ts'; // Assuming returns typed store
import { Store } from 'pinia'; // Import Store type if needed for explicit typing

// Define more specific store types if available, otherwise use generic Store
// type AuthStoreType = ReturnType<typeof useAuthStore>; 
// type SurveyStoreType = ReturnType<typeof useSurveyStore>;
// type GameStoreType = ReturnType<typeof useGameStore>;

/**
 * Sign-Out mutation.
 *
 * @returns {UseMutationReturnType<void, Error, void, unknown>} The mutation object returned by `useMutation`.
 */
const useSignOutMutation = (): UseMutationReturnType<void, Error, void, unknown> => {
  const authStore = useAuthStore();
  const surveyStore = useSurveyStore();
  const gameStore = useGameStore();
  const router: Router = useRouter();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, void, unknown>({
    mutationKey: [SIGN_OUT_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (): Promise<void> => {
      // Assuming signOut exists and returns Promise<void>
      await authStore.roarfirekit?.signOut(); // Use optional chaining
    },
    onSuccess: async (): Promise<void> => {
      // Cancel all actively fetching queries.
      await queryClient.cancelQueries();

      // Reset store and delete persisted data.
      authStore.$reset();
      gameStore.$reset();
      surveyStore.$reset();
      sessionStorage.removeItem('authStore');
      sessionStorage.removeItem('surveyStore');
      sessionStorage.removeItem('gameStore');

      // Clear the query client.
      queryClient.clear();

      // Re-initialize Firekit.
      try {
          await authStore.initFirekit();
      } catch (initError) {
          console.error("Error re-initializing Firekit after sign out:", initError);
          Sentry.captureException(initError); 
          // Decide how to handle this - maybe redirect anyway?
      }

      // Redirect to sign-in page.
      router.push({ path: APP_ROUTES.SIGN_IN });
    },
    onError: (err: Error | unknown) => { // Type the error
      console.error("Error during sign out mutation:", err);
      Sentry.captureException(err);
      // Potentially add user feedback here
    },
  });
};

export default useSignOutMutation; 