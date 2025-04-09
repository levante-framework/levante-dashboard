import { computed, type MaybeRef, unref } from 'vue';
import {
  type UseQueryReturnType,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/vue-query';
import useDistrictsQuery from '@/composables/queries/useDistrictsQuery';
import useSchoolsQuery from '@/composables/queries/useSchoolsQuery.ts';
import useClassesQuery from '@/composables/queries/useClassesQuery.ts';
import useGroupsQuery from '@/composables/queries/useGroupsQuery';
import useFamiliesQuery from '@/composables/queries/useFamiliesQuery.ts';
import { SINGULAR_ORG_TYPES } from '@/constants/orgTypes';

// Define a generic OrgData type or import specific types if available
// Using 'any' for now as the structure varies significantly
type OrgData = any;

// Define a base query options type, allowing any structure for now
// TQueryKey needs to be broad enough to cover keys from underlying composables
type OrgQueryOptions = Omit<UseQueryOptions<OrgData[], Error, OrgData[], QueryKey>, 'queryKey' | 'queryFn'>;

// Define the possible return types from the underlying composables
// Replace 'any' with specific data types (DistrictData, SchoolData, etc.) if available
type OrgQueryResult = UseQueryReturnType<any[], Error>;

/**
 * Org Query
 *
 * Query composable for fetching org data based on a dynamic org type.
 *
 * @param {MaybeRef<string>} orgType – The org type to query.
 * @param {MaybeRef<string[] | undefined>} orgIds – The array of org IDs to fetch.
 * @param {OrgQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {OrgQueryResult} The TanStack query result from the corresponding composable.
 */
export default function useOrgQuery(
  orgType: MaybeRef<string>,
  orgIds: MaybeRef<string[] | undefined>,
  queryOptions: OrgQueryOptions = {},
): OrgQueryResult {
  // Ensure options enable the query by default if not specified
  const optionsWithDefaults = { enabled: true, ...queryOptions };

  // Use computed to reactively switch the query based on orgType
  const orgQuery = computed((): OrgQueryResult => {
    const currentOrgType = unref(orgType);
    switch (currentOrgType) {
      case SINGULAR_ORG_TYPES.DISTRICTS:
        // @ts-expect-error - Underlying composable might have slightly different options/return type
        return useDistrictsQuery(orgIds, optionsWithDefaults);
      case SINGULAR_ORG_TYPES.SCHOOLS:
        // No error expected here now
        return useSchoolsQuery(orgIds, optionsWithDefaults);
      case SINGULAR_ORG_TYPES.CLASSES:
        // No error expected here now
        return useClassesQuery(orgIds, optionsWithDefaults);
      case SINGULAR_ORG_TYPES.GROUPS:
        // @ts-expect-error - Underlying composable might have slightly different options/return type
        return useGroupsQuery(orgIds, optionsWithDefaults);
      case SINGULAR_ORG_TYPES.FAMILIES:
        // No error expected here now
        return useFamiliesQuery(orgIds, optionsWithDefaults);
      default:
        // Throw error for unsupported types
        throw new Error(`Unsupported org type: ${currentOrgType}`);
    }
  });

  // Return the reactive result of the selected query
  return orgQuery.value;
}
