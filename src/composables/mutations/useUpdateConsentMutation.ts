import { toValue } from 'vue';
import type { MaybeRef } from 'vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { CONSENT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';

// Define the structure for the input data, allowing for potential Refs
interface ConsentUpdatePayload {
  consentType: MaybeRef<string>;
  consentVersion: MaybeRef<string>;
  consentParams?: MaybeRef<Record<string, any> | undefined>; // Optional params object
}

/**
 * Consent Update mutation.
 *
 * TanStack mutation to update consent status and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useUpdateConsentMutation = (): UseMutationReturnType<void, Error, ConsentUpdatePayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, ConsentUpdatePayload, unknown>({
    mutationKey: [CONSENT_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (data: ConsentUpdatePayload): Promise<void> => {
      // Use toValue to get the actual values from potential Refs
      const consentType: string = toValue(data.consentType);
      const consentVersion: string = toValue(data.consentVersion);
      // Default to empty object if consentParams is undefined or null after toValue
      const consentParams: Record<string, any> = toValue(data.consentParams) ?? {};

      if (!authStore.isFirekitInit || !authStore.roarfirekit) {
        throw new Error('Roarfirekit is not initialized. Cannot update consent status.');
      }

      // Assuming updateConsentStatus exists and is async
      await authStore.roarfirekit.updateConsentStatus(consentType, consentVersion, consentParams);
    },
    onSuccess: () => {
      // Invalidate user data query upon successful consent update
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
    onError: (error: Error, variables: ConsentUpdatePayload) => {
        console.error(`Error updating consent status for type ${toValue(variables.consentType)}:`, error);
    }
    // Consider adding retry logic if needed
  });
};

export default useUpdateConsentMutation; 