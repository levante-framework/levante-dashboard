import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { SYNC_STATUS_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';

export const useGetSyncStatusQuery = (siteId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) => {
  const authStore = useAuthStore();

  return useQuery({
    meta: {
      composable: 'useGetSyncStatusQuery',
    },
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
  });
};
