import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_UPSERT_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';

// Define the structure for the administration data payload
// Keep generic for now, refine if specific structure is known
interface AdministrationUpsertPayload {
    // Example fields (adjust based on actual usage):
    // name?: string;
    // organizationId?: string;
    // taskVariantIds?: string[];
    // userIds?: string[];
    // startDate?: Date | string;
    // endDate?: Date | string;
    [key: string]: any; // Allow any properties
}

/**
 * Upsert Administration mutation.
 *
 * TanStack mutation to update or insert an administration and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useUpsertAdministrationMutation = (): UseMutationReturnType<void, Error, AdministrationUpsertPayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, AdministrationUpsertPayload, unknown>({
    mutationKey: [ADMINISTRATION_UPSERT_MUTATION_KEY], // Wrap key in array
    mutationFn: async (data: AdministrationUpsertPayload): Promise<void> => {
        if (!authStore.isFirekitInit || !authStore.roarfirekit) {
            throw new Error('Roarfirekit is not initialized. Cannot upsert administration.');
        }
        // Assuming createAdministration handles upsert logic and is async
      await authStore.roarfirekit.createAdministration(data);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
    onError: (error: Error, variables: AdministrationUpsertPayload) => {
        console.error('Error upserting administration:', error, 'Payload:', variables);
    }
    // Consider adding retry logic
  });
};

export default useUpsertAdministrationMutation; 