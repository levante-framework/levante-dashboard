import { computed, Ref, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { orgPageFetcher } from '@/helpers/query/orgs';
import { ORGS_TABLE_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
/**
 * Orgs Table query.
 *
 * Fetches all orgs assigned to the current user account. This query is intended to be used by the List Orgs page that
 * contains a tabbed data table with orgs (districts, schools, etc.) assigned to the user.
 *
 * @TODO: Explore the possibility of removing this query in favour of more granular queries for each org type.
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
  orderBy: Ref<any>,
  queryOptions?: UseQueryOptions,
): UseQueryReturnType => {
  const authStore = useAuthStore();
  const { adminOrgs } = storeToRefs(authStore);
  const { isUserSuperAdmin } = authStore;

  // Determine select fields based on org type
  const selectFields = computed(() => {
    const orgType = activeOrgType.value || activeOrgType;
    return orgType === 'groups'
      ? ['id', 'name', 'normalizedName', 'tags', 'parentOrgId']
      : ['id', 'name', 'normalizedName', 'tags'];
  });

  return useQuery({
    queryKey: [ORGS_TABLE_QUERY_KEY, activeOrgType, selectedDistrict, selectedSchool, orderBy],
    queryFn: () =>
      orgPageFetcher(
        activeOrgType,
        selectedDistrict,
        selectedSchool,
        orderBy,
        ref(100000),
        ref(0),
        ref(isUserSuperAdmin()),
        adminOrgs,
        selectFields.value,
      ),
    ...queryOptions,
  });
};

export default useOrgsTableQuery;
