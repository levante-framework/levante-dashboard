import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { SYNC_STATUS_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';

export const useGetSyncStatusQuery = (siteId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) => {
  const authStore = useAuthStore();

  return useQuery({
    queryKey: computed(() => [SYNC_STATUS_QUERY_KEY, toValue(siteId)]),
    queryFn: async () => {
      const firekit = authStore.roarfirekit;
      if (!firekit) throw new Error('Firekit not initialized');
      const result = await firekit.getSyncStatus({ siteId: toValue(siteId) });
      if (result.code !== 'success') throw result;
      return result.data;
    },
    enabled: () => !!toValue(siteId) && authStore.isFirekitInit() && toValue(enabled),
    refetchInterval: (query) =>
      query.state.data && (query.state.data.assignments.pending > 0 || query.state.data.users.pending > 0)
        ? 5000
        : false,
    meta: {
      errorMessage: 'Failed to get sync status',
      errorContext: {
        tags: { composable: 'useGetSyncStatusQuery' },
        siteId: toValue(siteId),
      },
    },
  });
};
