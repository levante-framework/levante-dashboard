import { GetUsersByOrgParamsSchema, type GetUsersByOrgResult } from '@levante-framework/levante-zod';
import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { ORG_TYPES } from '@/constants/orgTypes';
import { ORG_USERS_QUERY_KEY } from '@/constants/queryKeys';
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
  queryOptions?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
): UseQueryReturnType<GetUsersByOrgResult['users'], Error> => {
  return useQuery({
    queryKey: [ORG_USERS_QUERY_KEY, orgType, orgId],
    queryFn: async () => {
      const params = GetUsersByOrgParamsSchema.parse({
        orgType: ROAR_TO_LEVANTE_ORG_TYPE[orgType] ?? orgType,
        orgId,
      });
      const result = await usersRepository.getUsersByOrg(params);
      if (result.code !== 'success') throw result;
      return result.data.users;
    },
    ...queryOptions,
  });
};

export default useGetUsersByOrgQuery;
