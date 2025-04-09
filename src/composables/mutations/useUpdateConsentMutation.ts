import { type MaybeRef, unref } from 'vue';
import { useMutation, useQueryClient, type UseMutationReturnType, type UseMutationOptions } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { CONSENT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';

// Define the structure for the input variables
interface UpdateConsentVariables {
  consentType: MaybeRef<string>;
  consentVersion: MaybeRef<string>;
  consentParams?: MaybeRef<Record<string, any>>; // Params are optional object
}

// Define context type (void for this mutation)
type UpdateConsentContext = void;

/**
 * Consent Update mutation.
 *
 * TanStack mutation to update consent status and automatically invalidate the corresponding queries.
 *
 * @returns {UseMutationReturnType<void, Error, UpdateConsentVariables, UpdateConsentContext>} The mutation object returned by `useMutation`.
 */
const useUpdateConsentMutation = (): UseMutationReturnType<void, Error, UpdateConsentVariables, UpdateConsentContext> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateConsentVariables, UpdateConsentContext>({
    mutationKey: [CONSENT_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (data: UpdateConsentVariables): Promise<void> => {
      // Unwrap potential refs
      const consentType = unref(data.consentType);
      const consentVersion = unref(data.consentVersion);
      const consentParams = unref(data.consentParams) ?? {}; // Default to empty object if undefined

      // Ensure roarfirekit and method exist
      if (!authStore.roarfirekit?.updateConsentStatus) {
        throw new Error('Roarfirekit not initialized or updateConsentStatus method missing.');
      }
      await authStore.roarfirekit.updateConsentStatus(consentType, consentVersion, consentParams);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate user data query
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
    onError: (error: Error, variables, context) => {
      console.error('[useUpdateConsentMutation] Failed to update consent:', error, 'Variables:', variables);
    },
  });
};

export default useUpdateConsentMutation;
