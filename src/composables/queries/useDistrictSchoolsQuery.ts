import { computed, toValue, Ref } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { orgFetcher } from '@/helpers/query/orgs';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { DISTRICT_SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface School {
  id: string;
  name: string;
  tags?: string[];
  currentActivationCode?: string;
  lowGrade?: number;
  [key: string]: any;
}

interface UserType {
  isSuperAdmin: boolean;
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<School[], Error>>;

/**
 * District Schools query.
 *
 * Query designed to fetch the schools of a given district.
 *
 * @param {Ref<string>} districtId – A Vue ref containing the ID of the district to fetch schools for.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useDistrictSchoolsQuery = (
  districtId: Ref<string>,
  queryOptions: QueryOptions | undefined = undefined
) => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    queryKey: ['userClaims'],
    enabled: queryOptions?.enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims) as UserType;
  const administrationOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => !!toValue(districtId), () => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  // Fields to select for the query.
  const select = ['name', 'id', 'tags', 'currentActivationCode', 'lowGrade'];

  return useQuery({
    queryKey: [DISTRICT_SCHOOLS_QUERY_KEY, districtId],
    queryFn: () => orgFetcher(FIRESTORE_COLLECTIONS.SCHOOLS, districtId, isSuperAdmin, administrationOrgs, select),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDistrictSchoolsQuery; 