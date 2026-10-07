import {
  type GetSiteOverviewError,
  GetSiteOverviewErrorSchema,
  GetSiteOverviewParamsSchema,
  type GetSiteOverviewResult,
} from '@levante-framework/levante-zod';
import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { SITE_OVERVIEW_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { groupsRepository } from '@/firebase/repositories/GroupsRepository';

export const useGetSiteOverviewQuery = (
  siteId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<GetSiteOverviewResult, FirebaseFailure<GetSiteOverviewError>> => {
  return useQuery({
    queryKey: computed(() => [SITE_OVERVIEW_QUERY_KEY, toValue(siteId)]),
    queryFn: async () => {
      try {
        const params = GetSiteOverviewParamsSchema.parse({ siteId: toValue(siteId) });
        return await groupsRepository.getSiteOverview(params);
      } catch (error) {
        throw toFirebaseFailure(error, GetSiteOverviewErrorSchema);
      }
    },
    enabled: () => !!toValue(siteId) && toValue(enabled),
    meta: {
      errorMessage: 'Failed to get site overview',
      errorContext: {
        tags: { composable: 'useGetSiteOverviewQuery' },
        get siteId() {
          return toValue(siteId);
        },
      },
    },
  });
};
