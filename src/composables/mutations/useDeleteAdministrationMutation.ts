import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_DELETE_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';

// Define type for the variable passed to the mutation function
type AdministrationId = string; // Assuming string, adjust if number or other type

/**
 * Delete Administration mutation.
 *
 * TanStack mutation to delete an administration and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useDeleteAdministrationMutation = (): UseMutationReturnType<void, Error, AdministrationId, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, AdministrationId, unknown>({
    mutationKey: [ADMINISTRATION_DELETE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (administrationId: AdministrationId): Promise<void> => {
        if (!authStore.isFirekitInit || !authStore.roarfirekit) {
            throw new Error('Roarfirekit is not initialized. Cannot delete administration.');
        }
      await authStore.roarfirekit.deleteAdministration(administrationId);
    },
    onSuccess: () => {
      // Invalidate the queries to refetch the administration data.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
    onError: (error: Error, variables: AdministrationId) => {
        console.error(`Error deleting administration with ID ${variables}:`, error);
    }
    // Consider adding retry logic if needed
  });
};

export default useDeleteAdministrationMutation; 