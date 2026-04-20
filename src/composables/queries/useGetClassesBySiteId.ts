import { groupsRepository } from '@/firebase/repositories/GroupsRepository';
import { computeQueryOverrides, QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { useQuery } from '@tanstack/vue-query';
import { Ref } from 'vue';

export const useGetClassesBySiteId = (siteIdRef: Ref<string | null>, queryOptions?: QueryOptionsWithEnabled) => {
  const queryConditions = [() => !!siteIdRef];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: ['classes', siteIdRef],
    queryFn: async () => await groupsRepository.getClassesBySiteId(siteIdRef),
    enabled: isQueryEnabled,
    ...options,
  });
};
