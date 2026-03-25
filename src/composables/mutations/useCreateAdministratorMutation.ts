import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { CREATE_ADMINISTRATOR_MUTATION_KEY } from '@/constants/mutationKeys';
import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { usersRepository, type CreateAdministratorPayload } from '@/firebase/repositories/UsersRepository';
import { logger } from '@/logger';

const useCreateAdministratorMutation = (): UseMutationReturnType<
  unknown,
  Error,
  CreateAdministratorPayload,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CREATE_ADMINISTRATOR_MUTATION_KEY,
    mutationFn: async (payload: CreateAdministratorPayload): Promise<unknown> => {
      return usersRepository.createAdministrator(payload);
    },
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [ADMINS_QUERY_KEY] });
      logger.capture('Admin: Create administrator', { email: payload.email });
    },
    onError: (error: Error, payload: CreateAdministratorPayload): void => {
      logger.error(error, { payload });
    },
  });
};

export default useCreateAdministratorMutation;
