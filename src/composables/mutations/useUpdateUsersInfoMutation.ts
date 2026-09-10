import {
  type UpdateUsersInfoError,
  UpdateUsersInfoErrorSchema,
  type UpdateUsersInfoParams,
  type UpdateUsersInfoResult,
} from '@levante-framework/levante-zod';
import { type UseMutationReturnType, useMutation, useQueryClient } from '@tanstack/vue-query';
import { USERS_INFO_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const useUpdateUsersInfoMutation = (): UseMutationReturnType<
  UpdateUsersInfoResult,
  FirebaseFailure<UpdateUsersInfoError>,
  UpdateUsersInfoParams,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: USERS_INFO_UPDATE_MUTATION_KEY,
    mutationFn: async (params: UpdateUsersInfoParams): Promise<UpdateUsersInfoResult> => {
      try {
        const result = await usersRepository.updateUsersInfo(params);
        return result;
      } catch (error) {
        throw toFirebaseFailure(error, UpdateUsersInfoErrorSchema);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_USERS_QUERY_KEY], refetchType: 'all' });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useUpdateUsersInfoMutation;
