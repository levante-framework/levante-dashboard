import { computed, toValue, MaybeRef, Ref, ComputedRef } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { orgFetcher } from '@/helpers/query/orgs';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import useUserType, { UserTypeInfo } from '@/composables/useUserType.ts';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery.ts';
import { DISTRICT_SCHOOLS_QUERY_KEY, USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { DocumentData } from '@/helpers/query/utils';

interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

interface AdminOrgs {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

interface SchoolData extends DocumentData {
  name?: string;
  tags?: string[];
  currentActivationCode?: string;
  lowGrade?: string | number;
  [key: string]: any;
}

/**
 * District Schools query.
 *
 * Query designed to fetch the schools of a given district.
 *
 * @param {MaybeRef<string>} districtId – A Vue ref containing the ID of the district to fetch schools for.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<SchoolData[], Error>} The TanStack query result.
 */
const useDistrictSchoolsQuery = (
  districtId: MaybeRef<string>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<SchoolData[], Error> => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    queryKey: [USER_CLAIMS_QUERY_KEY],
    enabled: computed(() => toValue(queryOptions?.enabled ?? true)),
  });

  // Get admin status and administration orgs.
  const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
  const isSuperAdmin: ComputedRef<boolean> = userTypeInfo.isSuperAdmin;
  const administrationOrgs: ComputedRef<AdminOrgs> = computed(() => userClaims.value?.claims?.minimalAdminOrgs || {});

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const conditions = [() => !!toValue(districtId), () => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  // Comment out or remove unused select variable definition
  // const select: string[] = ['name', 'id', 'tags', 'currentActivationCode', 'lowGrade'];

  const queryKey = computed(() => [DISTRICT_SCHOOLS_QUERY_KEY, toValue(districtId)] as const);

  const queryFn = async (): Promise<SchoolData[]> => {
    const currentDistrictId = toValue(districtId);
    if (!currentDistrictId) return [];

    // Ensure only 4 arguments are passed to orgFetcher
    const data = await orgFetcher(
      FIRESTORE_COLLECTIONS.SCHOOLS,
      currentDistrictId,
      isSuperAdmin.value,
      administrationOrgs // Pass the ref
    );
    return Array.isArray(data) ? (data as SchoolData[]) : [];
  };

  return useQuery<SchoolData[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDistrictSchoolsQuery; 