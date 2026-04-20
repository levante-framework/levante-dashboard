import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { computeQueryOverrides, QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { useQuery } from '@tanstack/vue-query';
import { Ref } from 'vue';

export const useGetUsersBySiteId = (siteIdRef: Ref<string | null>, queryOptions?: QueryOptionsWithEnabled) => {
  const queryConditions = [() => !!siteIdRef];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: ['users', siteIdRef],
    queryFn: async () => await usersRepository.getUsersBySiteId(siteIdRef),
    enabled: isQueryEnabled,
    ...options,
  });
};
