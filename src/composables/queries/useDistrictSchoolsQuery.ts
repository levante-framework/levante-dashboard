import { computed, type MaybeRef, unref, type Ref, type ComputedRef } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { orgFetcher } from '@/helpers/query/orgs';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery.ts';
import { DISTRICT_SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for school data within a district context
interface DistrictSchoolData {
  id: string;
  name?: string;
  tags?: string[];
  currentActivationCode?: string;
  lowGrade?: string | number;
  [key: string]: any;
}

// Define specific query options type
type DistrictSchoolsQueryOptions = Omit<
  UseQueryOptions<DistrictSchoolData[], Error, DistrictSchoolData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' // Keep enabled
>;

/**
 * District Schools query.
 *
 * Query designed to fetch the schools of a given district.
 *
 * @param {MaybeRef<string | undefined>} districtId – A Vue ref containing the ID of the district to fetch schools for.
 * @param {DistrictSchoolsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<DistrictSchoolData[], Error>} The TanStack query result.
 */
const useDistrictSchoolsQuery = (
  districtId: MaybeRef<string | undefined>,
  queryOptions: DistrictSchoolsQueryOptions = {},
): UseQueryReturnType<DistrictSchoolData[], Error> => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    enabled: queryOptions.enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims as Ref<UserClaimsData | null>); // Cast needed due to query return type
  const administrationOrgs: ComputedRef<Record<string, string[]> | undefined> = computed(
    () => (userClaims.value as UserClaimsData | null)?.claims?.minimalAdminOrgs,
  );

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims.value?.claims));
  const queryConditions: Condition[] = [() => !!unref(districtId), () => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  // Fields to select for the query.
  const selectFields: string[] = ['name', 'id', 'tags', 'currentActivationCode', 'lowGrade'];

  return useQuery<DistrictSchoolData[], Error, DistrictSchoolData[], ReadonlyArray<unknown>>({
    // Pass ref directly to queryKey
    queryKey: [DISTRICT_SCHOOLS_QUERY_KEY, districtId],
    queryFn: async (): Promise<DistrictSchoolData[]> => {
      const currentDistrictId = unref(districtId);
      if (!currentDistrictId) {
        return Promise.resolve([]); // No district ID, no fetch
      }
      // Fetch org data, ensure return type matches or cast
      const result = await orgFetcher(
        FIRESTORE_COLLECTIONS.SCHOOLS,
        currentDistrictId,
        isSuperAdmin.value, // Pass boolean value
        administrationOrgs.value, // Pass Record<string, string[]> | undefined
        selectFields,
      );
      return result as DistrictSchoolData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDistrictSchoolsQuery;
