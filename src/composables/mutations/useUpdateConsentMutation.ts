import { toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { CONSENT_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';

interface ConsentUpdateData {
  consentType: MaybeRefOrGetter<string>;
  consentVersion: MaybeRefOrGetter<string>;
  consentParams?: MaybeRefOrGetter<Record<string, any>>;
}

/**
 * Consent Update mutation.
 *
 * TanStack mutation to update consent status and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useUpdateConsentMutation = (): UseMutationReturnType<void, Error, ConsentUpdateData, unknown> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CONSENT_UPDATE_MUTATION_KEY,
    mutationFn: async (data: ConsentUpdateData): Promise<void> => {
      const consentType = toValue(data.consentType);
      const consentVersion = toValue(data.consentVersion);
      const consentParams = toValue(data.consentParams) || {};

      await authStore.roarfirekit.updateConsentStatus(consentType, consentVersion, consentParams);
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [USER_DATA_QUERY_KEY] });
    },
  });
};

export default useUpdateConsentMutation;
