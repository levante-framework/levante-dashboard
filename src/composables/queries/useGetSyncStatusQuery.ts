import {
  type GetSyncStatusError,
  GetSyncStatusErrorSchema,
  GetSyncStatusParamsSchema,
  type GetSyncStatusResult,
} from '@levante-framework/levante-zod';
import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { SYNC_STATUS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { groupsRepository } from '@/firebase/repositories/GroupsRepository';

export const useGetSyncStatusQuery = (
  siteId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<GetSyncStatusResult, FirebaseFailure<GetSyncStatusError>> => {
  return useQuery({
    queryKey: computed(() => [SYNC_STATUS_QUERY_KEY, toValue(siteId)]),
    queryFn: async () => {
      try {
        const params = GetSyncStatusParamsSchema.parse({ siteId: toValue(siteId) });
        return await groupsRepository.getSyncStatus(params);
      } catch (error) {
        throw toFirebaseFailure(error, GetSyncStatusErrorSchema);
      }
    },
    enabled: () => !!toValue(siteId) && toValue(enabled),
    refetchInterval: (query) =>
      query.state.data && (query.state.data.assignments.pending > 0 || query.state.data.users.pending > 0)
        ? 5000
        : false,
    meta: {
      errorMessage: 'Failed to get sync status',
      errorContext: {
        tags: { composable: 'useGetSyncStatusQuery' },
        get siteId() {
          return toValue(siteId);
        },
      },
    },
  });
};
