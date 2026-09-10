import {
  type GetUserOverviewError,
  GetUserOverviewErrorSchema,
  GetUserOverviewParamsSchema,
  type GetUserOverviewResult,
} from '@levante-framework/levante-zod';
import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { USER_OVERVIEW_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

export const useGetUserOverviewQuery = (
  uid: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<GetUserOverviewResult, FirebaseFailure<GetUserOverviewError>> => {
  return useQuery({
    queryKey: computed(() => [USER_OVERVIEW_QUERY_KEY, toValue(uid)]),
    queryFn: async () => {
      try {
        const params = GetUserOverviewParamsSchema.parse({ uid: toValue(uid) });
        return await usersRepository.getUserOverview(params);
      } catch (error) {
        throw toFirebaseFailure(error, GetUserOverviewErrorSchema);
      }
    },
    enabled: () => !!toValue(uid) && toValue(enabled),
    meta: {
      errorMessage: 'Failed to get user overview',
      errorContext: {
        tags: { composable: 'useGetUserOverviewQuery' },
        uid: toValue(uid),
      },
    },
  });
};
