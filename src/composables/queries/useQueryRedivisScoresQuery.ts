import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { REDIVIS_SCORES_QUERY_KEY } from '@/constants/queryKeys';
import { redivisRepository } from '@/firebase/repositories/RedivisRepository';

export const useQueryRedivisScoresQuery = (
  siteId: MaybeRefOrGetter<string | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) => {
  return useQuery({
    meta: {
      composable: 'useQueryRedivisScoresQuery',
    },
    queryKey: computed(() => [REDIVIS_SCORES_QUERY_KEY, toValue(siteId)]),
    queryFn: async () => {
      const resolvedSiteId = toValue(siteId);
      if (!resolvedSiteId) throw new Error('siteId is required');
      return redivisRepository.queryScores({ siteId: resolvedSiteId });
    },
    enabled: () => {
      const resolvedSiteId = toValue(siteId);
      return !!resolvedSiteId && resolvedSiteId !== 'any' && toValue(enabled);
    },
  });
};
