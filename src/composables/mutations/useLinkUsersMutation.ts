import {
  type LinkUsersError,
  LinkUsersErrorSchema,
  type LinkUsersParams,
  type LinkUsersResult,
} from '@levante-framework/levante-zod';
import { type UseMutationReturnType, useMutation } from '@tanstack/vue-query';
import { LINK_USERS_MUTATION_KEY } from '@/constants/mutationKeys';
import { type FirebaseCallFailure, toFirebaseCallFailure } from '@/firebase/callFailure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const useLinkUsersMutation = (): UseMutationReturnType<
  LinkUsersResult,
  FirebaseCallFailure<LinkUsersError>,
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
        throw toFirebaseCallFailure(error, LinkUsersErrorSchema);
      }
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useLinkUsersMutation;
