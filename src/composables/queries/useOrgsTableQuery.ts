import { computed, ref, MaybeRef, toValue, Ref, ComputedRef } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserType, { UserTypeInfo } from '@/composables/useUserType.ts';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery.ts';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { orgPageFetcher } from '@/helpers/query/orgs';
import { ORGS_TABLE_QUERY_KEY, USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { DocumentData, OrderBy } from '@/helpers/query/utils';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define AdminOrgs structure
interface AdminOrgs {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

// Define OrgData structure (base type)
interface OrgData extends DocumentData {
  name?: string;
  [key: string]: any;
}

/**
 * Orgs Table query.
 *
 * Fetches all orgs assigned to the current user account for a data table.
 *
 * @param {MaybeRef<string>} activeOrgType – The active org type (district, school, etc.).
 * @param {MaybeRef<string | undefined>} selectedDistrict – The selected district ID.
 * @param {MaybeRef<string | undefined>} selectedSchool – The selected school ID.
 * @param {MaybeRef<OrderBy[]>} orderBy – The order by field definition.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<OrgData[], Error>} The TanStack query result.
 */
const useOrgsTableQuery = (
  activeOrgType: Ref<string>,
  selectedDistrict: Ref<string | undefined>,
  selectedSchool: Ref<string | undefined>,
  orderBy: Ref<OrderBy[]>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<OrgData[], Error> => {

  const { data: userClaims } = useUserClaimsQuery({
      queryKey: [USER_CLAIMS_QUERY_KEY],
      enabled: computed(() => toValue(queryOptions?.enabled ?? true)),
  });

  const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
  const isSuperAdmin: ComputedRef<boolean> = userTypeInfo.isSuperAdmin;
  const adminOrgs: ComputedRef<AdminOrgs> = computed(() => userClaims.value?.claims?.minimalAdminOrgs || {});

  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  const queryKey = computed(() => [
      ORGS_TABLE_QUERY_KEY,
      activeOrgType.value,
      selectedDistrict.value,
      selectedSchool.value,
      orderBy.value
  ] as const);

  const queryFn = async (): Promise<OrgData[]> => {
    // orgPageFetcher expects refs for pagination, hardcode for now
    const pageLimit = ref(100000);
    const page = ref(0);

    const data = await orgPageFetcher(
      activeOrgType,
      selectedDistrict,
      selectedSchool,
      orderBy,
      pageLimit,
      page,
      isSuperAdmin.value,
      adminOrgs
    );
    return Array.isArray(data) ? (data as OrgData[]) : [];
  };

  return useQuery<OrgData[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useOrgsTableQuery; 