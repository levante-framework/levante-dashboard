import { computed, Ref } from 'vue';
import { useQuery, UseQueryOptions, UseQueryReturnType } from '@tanstack/vue-query';
import { orgFetchAll } from '@/helpers/query/orgs';
import { ORGS_TABLE_QUERY_KEY } from '@/constants/queryKeys';
import { ORG_TYPES } from '@/constants/orgTypes';

/**
 * Orgs Table query.
 *
 * Fetches all orgs assigned to the current user account. This query is intended to be used by the List Orgs page that
 * contains a tabbed data table with orgs (districts, schools, etc.) assigned to the user.
 *
 * Firestore rules handle permission filtering, so no client-side filtering is needed.
 *
 * @param {String} activeOrgType – The active org type (district, school, etc.).
 * @param {String} selectedDistrict – The selected district ID.
 * @param {String} selectedSchool – The selected school ID.
 * @param {String} orderBy – The order by field.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useOrgsTableQuery = (
  activeOrgType: Ref<string>,
  selectedDistrict: Ref<string>,
  selectedSchool: Ref<string>,
  orderBy: Ref<string>,
  queryOptions?: UseQueryOptions,
): UseQueryReturnType<unknown, Error> => {
  const selectFields = computed<string[]>(() => {
    const orgType = activeOrgType.value;
    if (orgType === ORG_TYPES.GROUPS) {
      return ['id', 'name', 'tags', 'parentOrgId', 'createdBy'];
    }
    return ['id', 'name', 'tags', 'createdBy'] as const;
  });

  return useQuery({
    queryKey: [ORGS_TABLE_QUERY_KEY, 'withCreators', activeOrgType, selectedDistrict, selectedSchool, orderBy],
    queryFn: () =>
      orgFetchAll(
        activeOrgType,
        selectedDistrict,
        selectedSchool,
        orderBy,
        selectFields.value,
        true, // includeCreators = true
      ),
    ...queryOptions,
  });
};

export default useOrgsTableQuery;
