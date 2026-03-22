import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { CREATE_UPDATE_SUPER_ADMIN_MUTATION_KEY } from '@/constants/mutationKeys';
import { ADMINS_QUERY_KEY } from '@/constants/queryKeys';
import {
  manageAdministratorsRepository,
  type CreateUpdateSuperAdminPayload,
} from '@/firebase/repositories/ManageAdministratorsRepository';
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
      return manageAdministratorsRepository.createUpdateSuperAdmin(payload);
    },
    onSuccess: (_data, payload): void => {
      queryClient.invalidateQueries({ queryKey: [ADMINS_QUERY_KEY] });
      logger.capture('Admin: Create or update super admin', { adminUid: payload.adminUid, email: payload.email });
    },
    onError: (error: Error, payload: CreateUpdateSuperAdminPayload): void => {
      logger.error(error, { payload });
    },
  });
};

export default useCreateUpdateSuperAdminMutation;
