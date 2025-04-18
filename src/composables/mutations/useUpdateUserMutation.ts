import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';
import { USER_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure for the user data being updated
// Add known fields, make them optional for updates
interface UserUpdateData {
    firstName?: string;
    lastName?: string;
    email?: string;
    birthMonth?: string | number;
    birthYear?: string | number;
    grade?: string | number;
    notes?: string;
    // Add other potential user fields here
    [key: string]: any; // Allow flexibility
}

// Define the structure for the mutation variables
interface UserUpdatePayload {
    userId: string; // Assuming userId is a string
    userData: UserUpdateData;
}

/**
 * Update User mutation.
 *
 * TanStack mutation to update a user record and automatically invalidate the corresponding queries.
 * @returns The mutation object returned by `useMutation`.
 */
const useUpdateUserMutation = (): UseMutationReturnType<void, Error, UserUpdatePayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, UserUpdatePayload, unknown>({
    mutationKey: [USER_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async ({ userId, userData }: UserUpdatePayload): Promise<void> => {
        if (!authStore.isFirekitInit || !authStore.roarfirekit) {
            throw new Error('Roarfirekit is not initialized. Cannot update user data.');
        }
        // Assuming updateUserData exists and is async
      await authStore.roarfirekit.updateUserData(userId, userData);
    },
    onSuccess: () => {
      // Invalidate the user data query upon successful update
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
    onError: (error: Error, variables: UserUpdatePayload) => {
        console.error(`Error updating user data for user ID ${variables.userId}:`, error);
    }
    // Consider adding retry logic
  });
};

export default useUpdateUserMutation; 