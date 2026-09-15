import {
  type CreateUsersError,
  CreateUsersErrorSchema,
  type CreateUsersParams,
  type CreateUsersResult,
} from '@levante-framework/levante-zod';
import { type UseMutationReturnType, useMutation, useQueryClient } from '@tanstack/vue-query';
import { CREATE_USERS_MUTATION_KEY } from '@/constants/mutationKeys';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const useCreateUsersMutation = (): UseMutationReturnType<
  CreateUsersResult,
  FirebaseFailure<CreateUsersError>,
  CreateUsersParams,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CREATE_USERS_MUTATION_KEY,
    mutationFn: async (params: CreateUsersParams): Promise<CreateUsersResult> => {
      try {
        return await usersRepository.createUsers(params);
      } catch (error) {
        throw toFirebaseFailure(error, CreateUsersErrorSchema);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_USERS_QUERY_KEY], refetchType: 'all' });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useCreateUsersMutation;
