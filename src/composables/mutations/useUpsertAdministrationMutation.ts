import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_UPSERT_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';

// Define the structure for the administration data being created/updated
// Should match the parameter of roarfirekit.createAdministration
interface AdministrationInputData {
  id?: string; // ID might be optional for creation, required for update?
  name?: string;
  // Define other administration fields
  [key: string]: any;
}

// Define context type
type UpsertAdministrationContext = void;

/**
 * Upsert Administration mutation.
 *
 * TanStack mutation to update or insert an administration and automatically invalidate the corresponding queries.
 *
 * @returns {UseMutationReturnType<void, Error, AdministrationInputData, UpsertAdministrationContext>} The mutation object returned by `useMutation`.
 */
const useUpsertAdministrationMutation = (): UseMutationReturnType<
  void,
  Error,
  AdministrationInputData,
  UpsertAdministrationContext
> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, AdministrationInputData, UpsertAdministrationContext>({
    mutationKey: [ADMINISTRATION_UPSERT_MUTATION_KEY], // Wrap key in array
    mutationFn: async (data: AdministrationInputData): Promise<void> => {
      // Ensure roarfirekit and method exist
      if (!authStore.roarfirekit?.createAdministration) {
        throw new Error('Roarfirekit not initialized or createAdministration method missing.');
      }
      // Assuming createAdministration handles both create and update (upsert)
      await authStore.roarfirekit.createAdministration(data);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate the queries to refetch the administration data.
      // @NOTE: Usually we would apply a more granular invalidation strategy including updating the specific
      // adminitration record in the cache. However, unfortunately, given the nature of the data model and the data that
      // is updated in the application, we would have to manually map the updated data, which could cause issues when
      // the data model changes. Therefore, we invalidate the entire query to ensure the data is up-to-date.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useUpsertAdministrationMutation] Failed to upsert administration:', error, 'Data:', variables);
    },
  });
};

export default useUpsertAdministrationMutation;
