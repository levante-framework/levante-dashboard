import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { orgFetchAllWithCreators } from '@/helpers/query/orgs';
import { ORGS_TABLE_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';
import type { MaybeRefOrGetter } from 'vue';

/**
 * Orgs with creators query.
 *
 * Fetches all orgs assigned to the current user account with creator data populated.
 * This extends the existing org fetching pattern to include user data for createdBy fields.
 *
 * @param {String} activeOrgType – The active org type (district, school, etc.).
 * @param {String} selectedDistrict – The selected district ID.
 * @param {String} selectedSchool – The selected school ID.
 * @param {String} orderBy – The order by field.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useOrgsWithCreatorsQuery = (
  activeOrgType: MaybeRefOrGetter<string>,
  selectedDistrict: MaybeRefOrGetter<string | undefined>,
  selectedSchool: MaybeRefOrGetter<string | undefined>,
  orderBy: MaybeRefOrGetter<any>,
  queryOptions?: any,
) => {
  const { data: userClaims } = useUserClaimsQuery({
    enabled: queryOptions?.enabled ?? true,
  });

  const authStore = useAuthStore();
  const { isUserSuperAdmin } = authStore;

  // Get admin's administation orgs.
  const adminOrgs = computed(() => userClaims.value?.claims?.adminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  // Determine select fields based on org type
  const selectFields = computed(() => {
    const orgType = typeof activeOrgType === 'function' ? activeOrgType() : activeOrgType.value || activeOrgType;
    if (orgType === 'groups') {
      return ['id', 'name', 'tags', 'parentOrgId', 'createdBy'];
    }
    return ['id', 'name', 'tags', 'createdBy'];
  });

  return useQuery({
    queryKey: [ORGS_TABLE_QUERY_KEY, 'withCreators', activeOrgType, selectedDistrict, selectedSchool, orderBy],
    queryFn: () =>
      orgFetchAllWithCreators(
        activeOrgType,
        selectedDistrict,
        selectedSchool,
        orderBy,
        isUserSuperAdmin(),
        adminOrgs,
        selectFields.value,
      ),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useOrgsWithCreatorsQuery;
