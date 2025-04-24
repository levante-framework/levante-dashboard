import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { ADMINISTRATION_CREATE_MUTATION_KEY } from '@/constants/mutationKeys';
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from '@/constants/queryKeys';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Create Administration mutation.
 *
 * TanStack mutation to create an administration and automatically invalidate the corresponding queries.
 * Uses Firebase Functions directly instead of the roarfirekit wrapper.
 *
 * @returns {Object} The mutation object returned by `useMutation`.
 */
const useCreateAdministrationMutation = () => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();
  const functions = getFunctions();

  return useMutation({
    mutationKey: ADMINISTRATION_CREATE_MUTATION_KEY,
    mutationFn: async (data) => {
      const createAdministrationFn = httpsCallable(functions, 'createAdministration');
      const result = await createAdministrationFn(data);
      return result.data;
    },
    onSuccess: () => {
      // Invalidate the queries to refetch the administration data.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY] });
    },
  });
};

export default useCreateAdministrationMutation; 