import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { ORG_TYPES } from '@/constants/orgTypes';
import { ORG_INFORMATION_STATUS } from '@/constants/queryKeys';

const mockOrgTypes = [ORG_TYPES.DISTRICTS, ORG_TYPES.SCHOOLS];
const mockInfoStatuses = ['not-started', 'incomplete', 'complete'];

export const useGetOrgInformationStatusQuery = (
  orgType: MaybeRefOrGetter<string>,
  orgIds: MaybeRefOrGetter<Array<string>>,
  enabled: MaybeRefOrGetter<boolean> = false,
) => {
  return useQuery({
    queryKey: computed(() => [ORG_INFORMATION_STATUS, toValue(orgType), toValue(orgIds)]),
    queryFn: () => {
      //
    },
    enabled: () => !!toValue(orgType) && !!toValue(orgIds)?.length && toValue(enabled),
    meta: {
      errorMessage: 'Failed to get org information status',
      errorContext: {
        tags: { composable: 'useGetOrgInformationStatusQuery' },
        get orgType() {
          return toValue(orgType);
        },
        get orgIds() {
          return toValue(orgIds);
        },
      },
    },
  });
};
