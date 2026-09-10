import {
  type UpdateUserInfoError,
  UpdateUserInfoErrorSchema,
  type UpdateUserInfoParams,
  type UpdateUserInfoResult,
} from '@levante-framework/levante-zod';
import { type UseMutationReturnType, useMutation, useQueryClient } from '@tanstack/vue-query';
import { USER_INFO_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const useUpdateUserInfoMutation = (): UseMutationReturnType<
  UpdateUserInfoResult,
  FirebaseFailure<UpdateUserInfoError>,
  UpdateUserInfoParams,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: USER_INFO_UPDATE_MUTATION_KEY,
    mutationFn: async (params: UpdateUserInfoParams): Promise<UpdateUserInfoResult> => {
      try {
        const result = await usersRepository.updateUserInfo(params);
        return result;
      } catch (error) {
        throw toFirebaseFailure(error, UpdateUserInfoErrorSchema);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_USERS_QUERY_KEY], refetchType: 'all' });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useUpdateUserInfoMutation;
