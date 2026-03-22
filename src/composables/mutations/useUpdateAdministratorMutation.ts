import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { UPDATE_ADMINISTRATOR_MUTATION_KEY } from '@/constants/mutationKeys';
import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import {
  manageAdministratorsRepository,
  type UpdateAdministratorPayload,
} from '@/firebase/repositories/ManageAdministratorsRepository';
import { logger } from '@/logger';

const useUpdateAdministratorMutation = (): UseMutationReturnType<
  unknown,
  Error,
  UpdateAdministratorPayload,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: UPDATE_ADMINISTRATOR_MUTATION_KEY,
    mutationFn: async (payload: UpdateAdministratorPayload): Promise<unknown> => {
      return manageAdministratorsRepository.updateAdministrator(payload);
    },
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [ADMINS_QUERY_KEY] });
      logger.capture('Admin: Update administrator', { adminUid: payload.adminUid });
    },
    onError: (error: Error, payload: UpdateAdministratorPayload): void => {
      logger.error(error, { payload });
    },
  });
};

export default useUpdateAdministratorMutation;
