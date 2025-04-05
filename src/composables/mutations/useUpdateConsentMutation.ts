import { toValue, MaybeRef } from 'vue';
import { useMutation, useQueryClient, UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { CONSENT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';

// Define structure for the mutation input variables
interface UpdateConsentInput {
  consentType: MaybeRef<string>;
  consentVersion: MaybeRef<string>;
  consentParams?: MaybeRef<Record<string, any> | undefined>;
}

/**
 * Consent Update mutation.
 *
 * TanStack mutation to update consent status and automatically invalidate the corresponding queries.
 *
 * @returns {UseMutationReturnType<void, Error, UpdateConsentInput, unknown>} The mutation object returned by `useMutation`.
 */
const useUpdateConsentMutation = (): UseMutationReturnType<void, Error, UpdateConsentInput, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, UpdateConsentInput, unknown>({
    mutationKey: [CONSENT_UPDATE_MUTATION_KEY], // Keys should be arrays
    mutationFn: async (data: UpdateConsentInput): Promise<void> => {
      // Resolve MaybeRef values
      const consentType = toValue(data.consentType);
      const consentVersion = toValue(data.consentVersion);
      const consentParams = toValue(data.consentParams) || {}; // Default to empty object

      if (!authStore.roarfirekit) {
        throw new Error('Roar Firekit not initialized');
      }
      // Assuming updateConsentStatus returns Promise<void>
      await authStore.roarfirekit.updateConsentStatus(consentType, consentVersion, consentParams);
    },
    onSuccess: () => {
      // Invalidate user data query on success
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
    // Optional: Add onError handler
  });
};

export default useUpdateConsentMutation; 