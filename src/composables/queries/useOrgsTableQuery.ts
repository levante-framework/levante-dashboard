import { computed, ref, Ref } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { orgPageFetcher } from '@/helpers/query/orgs';
import { ORGS_TABLE_QUERY_KEY } from '@/constants/queryKeys';
import { SINGULAR_ORG_TYPES, SingularOrgType } from '@/constants/orgTypes';

interface Organization {
  id: string;
  name: string;
  type: SingularOrgType;
  [key: string]: any;
}

interface UserType {
  isSuperAdmin: boolean;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<Organization[], Error>>;

/**
 * Orgs Table query.
 *
 * Fetches all orgs assigned to the current user account. This query is intended to be used by the List Orgs page that
 * contains a tabbed data table with orgs (districts, schools, etc.) assigned to the user.
 *
 * @TODO: Explore the possibility of removing this query in favour of more granular queries for each org type.
 *
 * @param {SingularOrgType} activeOrgType – The active org type (district, school, etc.).
 * @param {string | undefined} selectedDistrict – The selected district ID.
 * @param {string | undefined} selectedSchool – The selected school ID.
 * @param {string} orderBy – The order by field.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useOrgsTableQuery = (
  activeOrgType: SingularOrgType,
  selectedDistrict: string | undefined,
  selectedSchool: string | undefined,
  orderBy: string,
  queryOptions: QueryOptions | undefined = undefined
) => {
  const { data: userClaims } = useUserClaimsQuery({
    queryKey: ['userClaims'],
    enabled: queryOptions?.enabled ?? true,
  });

  // Get the admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims) as UserType;
  const adminOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<Organization[], Error>({
    queryKey: [ORGS_TABLE_QUERY_KEY, activeOrgType, selectedDistrict, selectedSchool, orderBy],
    queryFn: async () => {
      const orgs = await orgPageFetcher(
        activeOrgType,
        selectedDistrict,
        selectedSchool,
        orderBy,
        ref(100000),
        ref(0),
        isSuperAdmin,
        adminOrgs,
      );
      return orgs as Organization[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useOrgsTableQuery; 