import {
  type LinkUsersError,
  LinkUsersErrorSchema,
  type LinkUsersParams,
  type LinkUsersResult,
} from '@levante-framework/levante-zod';
import { type UseMutationReturnType, useMutation } from '@tanstack/vue-query';
import { LINK_USERS_MUTATION_KEY } from '@/constants/mutationKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const useLinkUsersMutation = (): UseMutationReturnType<
  LinkUsersResult,
  FirebaseFailure<LinkUsersError>,
  LinkUsersParams,
  void
> => {
  return useMutation({
    mutationKey: LINK_USERS_MUTATION_KEY,
    mutationFn: async (params: LinkUsersParams): Promise<LinkUsersResult> => {
      try {
        const result = await usersRepository.linkUsers(params);
        return result;
      } catch (error) {
        throw toFirebaseFailure(error, LinkUsersErrorSchema);
      }
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useLinkUsersMutation;
