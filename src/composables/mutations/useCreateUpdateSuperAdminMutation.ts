import type { UseMutationReturnType } from '@tanstack/vue-query';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { CREATE_UPDATE_SUPER_ADMIN_MUTATION_KEY } from '@/constants/mutationKeys';
import { ADMINS_QUERY_KEY, SUPER_ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import { type CreateUpdateSuperAdminPayload, usersRepository } from '@/firebase/repositories/UsersRepository';
import { logger } from '@/logger';

const useCreateUpdateSuperAdminMutation = (): UseMutationReturnType<
  unknown,
  Error,
  CreateUpdateSuperAdminPayload,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CREATE_UPDATE_SUPER_ADMIN_MUTATION_KEY,
    mutationFn: async (payload: CreateUpdateSuperAdminPayload): Promise<unknown> => {
      return usersRepository.createUpdateSuperAdmin(payload);
    },
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [ADMINS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUPER_ADMINS_QUERY_KEY] });
      logger.capture('Admin: Create or update super admin', { adminUid: payload.adminUid, email: payload.email });
    },
    onError: (error: Error, payload: CreateUpdateSuperAdminPayload): void => {
      logger.error(new Error('Failed to create or update super admin', { cause: error }), {
        tags: { function: 'useCreateUpdateSuperAdminMutation' },
        adminUid: payload.adminUid,
      });
    },
  });
};

export default useCreateUpdateSuperAdminMutation;
