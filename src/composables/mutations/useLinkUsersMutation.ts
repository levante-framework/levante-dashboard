import {
  type LinkUsersError,
  LinkUsersErrorSchema,
  type LinkUsersParams,
  type LinkUsersResult,
} from '@levante-framework/levante-zod';
import { type UseMutationReturnType, useMutation, useQueryClient } from '@tanstack/vue-query';
import { LINK_USERS_MUTATION_KEY } from '@/constants/mutationKeys';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const useLinkUsersMutation = (): UseMutationReturnType<
  LinkUsersResult,
  FirebaseFailure<LinkUsersError>,
  LinkUsersParams,
  void
> => {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_USERS_QUERY_KEY] });
    },
    meta: { skipGlobalErrorLogging: true },
  });
};

export default useLinkUsersMutation;
