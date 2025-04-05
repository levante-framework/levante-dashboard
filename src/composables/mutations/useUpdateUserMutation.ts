import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';
import { USER_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define structure for user data (adjust as needed)
interface UserData {
  name?: { first?: string; middle?: string; last?: string };
  email?: string;
  username?: string;
  // Add other potential user fields
  [key: string]: any;
}

// Define structure for the mutation input variables
interface UpdateUserInput {
  userId: string;
  userData: UserData;
}

/**
 * Update User mutation.
 *
 * TanStack mutation to update a user record and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 *
 * @returns {UseMutationReturnType<void, Error, UpdateUserInput, unknown>} The mutation object returned by `useMutation`.
 */
const useUpdateUserMutation = (): UseMutationReturnType<void, Error, UpdateUserInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, UpdateUserInput, unknown>({
    mutationKey: [USER_UPDATE_MUTATION_KEY], // Keys should be arrays
    mutationFn: async ({ userId, userData }: UpdateUserInput): Promise<void> => {
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming updateUserData returns Promise<void>
      await authStore.roarfirekit.updateUserData(userId, userData);
    },
    onSuccess: () => {
      // Invalidate user data query on success
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useUpdateUserMutation; 