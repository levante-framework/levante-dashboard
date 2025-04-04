import { computed } from 'vue';
import { UseQueryOptions } from '@tanstack/vue-query';
import useDistrictsQuery from '@/composables/queries/useDistrictsQuery';
import useSchoolsQuery from '@/composables/queries/useSchoolsQuery';
import useClassesQuery from '@/composables/queries/useClassesQuery';
import useGroupsQuery from '@/composables/queries/useGroupsQuery';
import useFamiliesQuery from '@/composables/queries/useFamiliesQuery';
import { SINGULAR_ORG_TYPES, SingularOrgType } from '@/constants/orgTypes';

interface Organization {
  id: string;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<Organization[], Error>>;

/**
 * Org Query
 *
 * Query composable for fetching org data based on a dynamic org type.
 *
 * @param {SingularOrgType} orgType – The org type to query.
 * @param {string[]} orgIds – The array of org IDs to fetch.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
export default function useOrgQuery(
  orgType: SingularOrgType,
  orgIds: string[],
  queryOptions: QueryOptions | undefined = undefined
) {
  queryOptions = { enabled: true, ...queryOptions };

  const orgQuery = computed(() => {
    switch (orgType) {
      case 'district':
        return useDistrictsQuery(orgIds, queryOptions);
      case 'school':
        return useSchoolsQuery(orgIds, queryOptions);
      case 'class':
        return useClassesQuery(orgIds, queryOptions);
      case 'group':
        return useGroupsQuery(orgIds, queryOptions);
      case 'family':
        return useFamiliesQuery(orgIds, queryOptions);
      default:
        throw new Error(`Unsupported org type: ${orgType}`);
    }
  });

  return orgQuery.value;
} 