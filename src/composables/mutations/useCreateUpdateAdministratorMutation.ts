import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { CREATE_UPDATE_ADMINISTRATOR_MUTATION_KEY } from '@/constants/mutationKeys';
import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { usersRepository, type CreateUpdateAdministratorPayload } from '@/firebase/repositories/UsersRepository';
import { logger } from '@/logger';

const useCreateUpdateAdministratorMutation = (): UseMutationReturnType<
  unknown,
  Error,
  CreateUpdateAdministratorPayload,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CREATE_UPDATE_ADMINISTRATOR_MUTATION_KEY,
    mutationFn: async (payload: CreateUpdateAdministratorPayload): Promise<unknown> => {
      return usersRepository.createUpdateAdministrator(payload);
    },
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [ADMINS_QUERY_KEY] });
      logger.capture('Admin: Create or update administrator', { adminUid: payload.adminUid, email: payload.email });
    },
    onError: (error: Error, payload: CreateUpdateAdministratorPayload): void => {
      logger.error(error, { payload });
    },
  });
};

export default useCreateUpdateAdministratorMutation;
