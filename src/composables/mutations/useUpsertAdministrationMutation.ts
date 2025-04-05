import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_UPSERT_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';

// Define the input structure for the administration data
interface AdministrationInput {
  // Define properties expected by roarfirekit.createAdministration
  name: string;
  assessments: any[]; // Replace 'any' with specific assessment type if known
  assignedOrgs: Record<string, string[]>; // e.g., { districts: [], schools: [], ...}
  // Add other fields like publicName, dateOpened, dateClosed, testData, etc.
  [key: string]: any; // Use a more specific type if known
}

/**
 * Upsert Administration mutation.
 *
 * TanStack mutation to update or insert an administration and automatically invalidate the corresponding queries.
 *
 * @returns {UseMutationReturnType<void, Error, AdministrationInput, unknown>} The mutation object returned by `useMutation`.
 */
const useUpsertAdministrationMutation = (): UseMutationReturnType<void, Error, AdministrationInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, AdministrationInput, unknown>({
    mutationKey: [ADMINISTRATION_UPSERT_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (data: AdministrationInput): Promise<void> => {
      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming createAdministration returns Promise<void>
      await authStore.roarfirekit.createAdministration(data);
    },
    onSuccess: () => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useUpsertAdministrationMutation; 