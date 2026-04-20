import { administrationsRepository } from '@/firebase/repositories/AdministrationsRepository';
import { computeQueryOverrides, QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { useQuery } from '@tanstack/vue-query';
import { Ref } from 'vue';

export const useGetAssignmentsBySiteId = (siteIdRef: Ref<string | null>, queryOptions?: QueryOptionsWithEnabled) => {
  const queryConditions = [() => !!siteIdRef];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: ['assignments', siteIdRef],
    queryFn: async () => await administrationsRepository.getAssignmentsBySiteId(siteIdRef),
    enabled: isQueryEnabled,
    ...options,
  });
};
