import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { SITE_OVERVIEW_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';

export const useGetSiteOverviewQuery = (
  siteId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) => {
  const authStore = useAuthStore();

  return useQuery({
    queryKey: computed(() => [SITE_OVERVIEW_QUERY_KEY, toValue(siteId)]),
    queryFn: async () => {
      const firekit = authStore.roarfirekit;
      if (!firekit) throw new Error('Firekit not initialized');
      const result = await firekit.getSiteOverview({ siteId: toValue(siteId) });
      if (result.code !== 'success') throw result;
      return result.data;
    },
    enabled: () => !!toValue(siteId) && authStore.isFirekitInit() && toValue(enabled),
    meta: {
      errorMessage: 'Failed to get site overview',
      errorContext: {
        tags: { composable: 'useGetSiteOverviewQuery' },
        siteId: toValue(siteId),
      },
    },
  });
};
