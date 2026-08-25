import {
  type GetUsersByOrgError,
  GetUsersByOrgErrorSchema,
  GetUsersByOrgParamsSchema,
  type GetUsersByOrgResult,
} from '@levante-framework/levante-zod';
import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { type MaybeRefOrGetter, toValue } from '@vueuse/core';
import { ORG_TYPES } from '@/constants/orgTypes';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseCallFailure, toFirebaseCallFailure } from '@/firebase/callFailure';
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const ROAR_TO_LEVANTE_ORG_TYPE: Record<string, string> = {
  [ORG_TYPES.DISTRICTS]: 'site',
  [ORG_TYPES.SCHOOLS]: 'school',
  [ORG_TYPES.CLASSES]: 'class',
  [ORG_TYPES.GROUPS]: 'cohort',
};

const useGetUsersByOrgQuery = (
  orgType: string,
  orgId: string,
  _page: number, // TODO: implement pagination
  _orderBy: string, // TODO: implement ordering
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<GetUsersByOrgResult, FirebaseCallFailure<GetUsersByOrgError>> => {
  return useQuery({
    queryKey: [ORG_USERS_QUERY_KEY, orgType, orgId],
    queryFn: async () => {
      try {
        const params = GetUsersByOrgParamsSchema.parse({
          orgType: ROAR_TO_LEVANTE_ORG_TYPE[orgType] ?? orgType,
          orgId,
        });
        const result = await usersRepository.getUsersByOrg(params);
        return result;
      } catch (error) {
        throw toFirebaseCallFailure(error, GetUsersByOrgErrorSchema);
      }
    },
    enabled: () => toValue(enabled),
    meta: {
      errorMessage: 'Failed to fetch users by org',
      errorContext: {
        tags: { composable: 'useGetUsersByOrgQuery' },
        orgType,
        orgId,
      },
    },
  });
};

export default useGetUsersByOrgQuery;
