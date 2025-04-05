import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_DELETE_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';

/**
 * Delete Administration mutation.
 *
 * TanStack mutation to delete an administration and automatically invalidate the corresponding queries.
 *
 * @returns {UseMutationReturnType<void, Error, string, unknown>} The mutation object returned by `useMutation`.
 */
const useDeleteAdministrationMutation = (): UseMutationReturnType<void, Error, string, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, string, unknown>({
    mutationKey: [ADMINISTRATION_DELETE_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (administrationId: string): Promise<void> => {
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming deleteAdministration returns Promise<void>
      await authStore.roarfirekit.deleteAdministration(administrationId);
    },
    onSuccess: () => {
      // Invalidate the queries to refetch the administration data.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useDeleteAdministrationMutation; 