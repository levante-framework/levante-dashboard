import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';
import { USER_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define structure for the user data being updated
// Should match the 'userData' parameter of roarfirekit.updateUserData
interface UserUpdatePayload {
  // Define expected fields for update
  firstName?: string;
  lastName?: string;
  email?: string; // Check if email can be updated this way
  // Add other updatable fields
  [key: string]: any;
}

// Define structure for the input variables
interface UpdateUserVariables {
  userId: string;
  userData: UserUpdatePayload;
}

// Define context type
type UpdateUserContext = void;

/**
 * Update User mutation.
 *
 * TanStack mutation to update a user record and automatically invalidate the corresponding queries.
 * @TODO: Evaluate if we can apply optimistic updates to prevent invalidating/refetching the data.
 *
 * @returns {UseMutationReturnType<void, Error, UpdateUserVariables, UpdateUserContext>} The mutation object returned by `useMutation`.
 */
const useUpdateUserMutation = (): UseMutationReturnType<void, Error, UpdateUserVariables, UpdateUserContext> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateUserVariables, UpdateUserContext>({
    mutationKey: [USER_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async ({ userId, userData }: UpdateUserVariables): Promise<void> => {
      // Ensure roarfirekit and method exist
      if (!authStore.roarfirekit?.updateUserData) {
        throw new Error('Roarfirekit not initialized or updateUserData method missing.');
      }
      await authStore.roarfirekit.updateUserData(userId, userData);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate user data query
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useUpdateUserMutation] Failed to update user:', error, 'Variables:', variables);
    },
  });
};

export default useUpdateUserMutation;
