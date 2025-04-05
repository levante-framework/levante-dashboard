import { computed, MaybeRef, ref, toValue } from 'vue';
import { UseQueryReturnType } from '@tanstack/vue-query';
import useDistrictsQuery from '@/composables/queries/useDistrictsQuery';
import useSchoolsQuery from '@/composables/queries/useSchoolsQuery';
import useClassesQuery from '@/composables/queries/useClassesQuery.ts';
import useGroupsQuery from '@/composables/queries/useGroupsQuery';
import useFamiliesQuery from '@/composables/queries/useFamiliesQuery.js';
import { ORG_TYPES } from '@/constants/orgTypes';
import { DocumentData } from '@/helpers/query/utils';

interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

interface BaseOrgData extends DocumentData {
  name?: string;
  [key: string]: any;
}

type OrgData = BaseOrgData;

/**
 * Org Query
 *
 * Query composable for fetching org data based on a dynamic org type.
 *
 * @param {MaybeRef<string>} orgType – The org type to query (e.g., 'district', 'school'). Case-insensitive.
 * @param {MaybeRef<string[]>} orgIds – The array of org IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgData[], Error>} The TanStack query result.
 */
export default function useOrgQuery(
  orgType: MaybeRef<string>,
  orgIds: MaybeRef<string[]>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<OrgData[], Error> {

  const resolvedOrgTypeUpper = computed(() => toValue(orgType)?.toUpperCase());
  const resolvedOrgIds = computed(() => toValue(orgIds));

  const orgQuery = computed(() => {
    const resolvedEnabled = toValue(queryOptions?.enabled ?? true);
    const currentOptions = { ...queryOptions, enabled: resolvedEnabled };
    const currentOrgIds = resolvedOrgIds.value ?? [];

    switch (resolvedOrgTypeUpper.value) {
      case ORG_TYPES.DISTRICTS:
        return useDistrictsQuery(currentOrgIds, currentOptions) as UseQueryReturnType<OrgData[], Error>;
      case ORG_TYPES.SCHOOLS:
        return useSchoolsQuery(currentOrgIds, currentOptions) as UseQueryReturnType<OrgData[], Error>;
      case ORG_TYPES.CLASSES:
        return useClassesQuery(currentOrgIds, currentOptions) as UseQueryReturnType<OrgData[], Error>;
      case ORG_TYPES.GROUPS:
        return useGroupsQuery(currentOrgIds, currentOptions) as UseQueryReturnType<OrgData[], Error>;
      case ORG_TYPES.FAMILIES:
        return useFamiliesQuery(currentOrgIds, currentOptions) as UseQueryReturnType<OrgData[], Error>;
      default:
        console.error(`Unsupported org type: ${resolvedOrgTypeUpper.value}`);
        const dummyError = new Error(`Unsupported org type: ${resolvedOrgTypeUpper.value}`);
        return {
          data: ref(undefined),
          error: ref(dummyError),
          isError: ref(true),
          isLoading: ref(false),
          isFetching: ref(false),
          isSuccess: ref(false),
          isPending: ref(false),
          isLoadingError: ref(true),
          isRefetchError: ref(false),
          isPlaceholderData: ref(false),
          status: ref('error'),
          fetchStatus: ref('idle'),
          refetch: (() => Promise.resolve(null)) as any,
        } as unknown as UseQueryReturnType<OrgData[], Error>;
    }
  });

  return orgQuery.value;
} 