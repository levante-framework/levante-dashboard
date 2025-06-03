import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { UseMutationReturnType } from "@tanstack/vue-query";
import { useAuthStore } from "@/store/auth";
import { ADMINISTRATION_UPSERT_MUTATION_KEY } from "@/constants/mutationKeys";
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from "@/constants/queryKeys";

interface AdministrationData {
  [key: string]: any;
}

/**
 * Upsert Administration mutation.
 *
 * TanStack mutation to update or insert an administration and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useUpsertAdministrationMutation = (): UseMutationReturnType<
  void,
  Error,
  AdministrationData,
  unknown
> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ADMINISTRATION_UPSERT_MUTATION_KEY,
    mutationFn: async (data: AdministrationData): Promise<void> => {
      console.log('useUpsertAdministrationMutation: Starting mutation with data:', data);
      
      if (!authStore.roarfirekit) {
        throw new Error('Firekit not initialized');
      }
      
      console.log('useUpsertAdministrationMutation: Firekit object:', authStore.roarfirekit);
      console.log('useUpsertAdministrationMutation: Available methods:', Object.getOwnPropertyNames(authStore.roarfirekit));
      console.log('useUpsertAdministrationMutation: Firekit prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authStore.roarfirekit)));
      
      // Check if upsertAdministration method exists
      if (typeof authStore.roarfirekit.upsertAdministration === 'function') {
        console.log('useUpsertAdministrationMutation: upsertAdministration method found, calling...');
        await authStore.roarfirekit.upsertAdministration(data);
      } else {
        console.error('useUpsertAdministrationMutation: upsertAdministration method not found!');
        console.log('useUpsertAdministrationMutation: Looking for alternative methods...');
        
        // Check for alternative method names
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(authStore.roarfirekit));
        const administrationMethods = methods.filter(method => 
          method.toLowerCase().includes('administration') || 
          method.toLowerCase().includes('upsert')
        );
        console.log('useUpsertAdministrationMutation: Found administration/upsert methods:', administrationMethods);
        
        // Try calling the cloud function directly
        console.log('useUpsertAdministrationMutation: Attempting to call cloud function directly...');
        try {
          const result = await authStore.roarfirekit.callFunction('upsertAdministration', data);
          console.log('useUpsertAdministrationMutation: Cloud function call successful:', result);
        } catch (error) {
          console.error('useUpsertAdministrationMutation: Cloud function call failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to upsert administration: ${errorMessage}`);
        }
      }
    },
    onSuccess: (): void => {
      // Invalidate the queries to refetch the administration data.
      // @NOTE: Usually we would apply a more granular invalidation strategy including updating the specific
      // adminitration record in the cache. However, unfortunately, given the nature of the data model and the data that
      // is updated in the application, we would have to manually map the updated data, which could cause issues when
      // the data model changes. Therefore, we invalidate the entire query to ensure the data is up-to-date.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY],
      });
    },
  });
};

export default useUpsertAdministrationMutation;
