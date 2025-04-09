import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_DELETE_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';

// Define the type for the variable passed to the mutation (administrationId)
type DeleteAdministrationVariables = string;

// Define the context type (likely void for this mutation)
type DeleteAdministrationContext = void;

/**
 * Delete Administration mutation.
 *
 * TanStack mutation to delete an administration and automatically invalidate the corresponding queries.
 *
 * @returns {UseMutationReturnType<void, Error, DeleteAdministrationVariables, DeleteAdministrationContext>} The mutation object returned by `useMutation`.
 */
const useDeleteAdministrationMutation = (): UseMutationReturnType<
  void,
  Error,
  DeleteAdministrationVariables,
  DeleteAdministrationContext
> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteAdministrationVariables, DeleteAdministrationContext>({
    mutationKey: [ADMINISTRATION_DELETE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (administrationId: DeleteAdministrationVariables): Promise<void> => {
      // Ensure roarfirekit and method exist
      if (!authStore.roarfirekit?.deleteAdministration) {
        throw new Error('Roarfirekit not initialized or deleteAdministration method missing.');
      }
      await authStore.roarfirekit.deleteAdministration(administrationId);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate the queries to refetch the administration data.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useDeleteAdministrationMutation] Failed to delete administration:', error, 'ID:', variables);
    },
  });
};

export default useDeleteAdministrationMutation;
