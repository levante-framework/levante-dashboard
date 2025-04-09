import { computed, type Ref, type ComputedRef, type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { orgFetcher } from '@/helpers/query/orgs';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery.ts';
import useUserType from '@/composables/useUserType';
import { DISTRICTS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for district data
interface DistrictData {
  id: string;
  name?: string;
  [key: string]: any;
}

// Use a simpler options type, explicitly omitting enabled
type DistrictsListQueryOptions = Omit<
  UseQueryOptions<DistrictData[], Error, DistrictData[], ReadonlyArray<string>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * Districts List query.
 *
 * @param {MaybeRef<boolean | undefined>} enabled - Explicit enabled state.
 * @param {DistrictsListQueryOptions | undefined} queryOptions – Optional TanStack query options (excluding enabled).
 * @returns {UseQueryReturnType<DistrictData[], Error>} The TanStack query result.
 */
const useDistrictsListQuery = (
  enabled: MaybeRef<boolean | undefined> = true,
  queryOptions: DistrictsListQueryOptions = {},
): UseQueryReturnType<DistrictData[], Error> => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    enabled: enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims as Ref<UserClaimsData | null>);
  const administrationOrgs: ComputedRef<Record<string, string[]> | undefined> = computed(
    () => (userClaims.value as UserClaimsData | null)?.claims?.minimalAdminOrgs,
  );

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims.value?.claims));
  // Add explicit enabled state to conditions
  const queryConditions: Condition[] = [() => claimsLoaded.value, () => unref(enabled) ?? true];
  // Pass options excluding enabled
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<DistrictData[], Error, DistrictData[], ReadonlyArray<string>>({
    queryKey: [DISTRICTS_LIST_QUERY_KEY],
    queryFn: async (): Promise<DistrictData[]> => {
      // Fetch org data, ensure return type matches or cast
      const result = await orgFetcher(
        FIRESTORE_COLLECTIONS.DISTRICTS,
        undefined,
        isSuperAdmin.value,
        administrationOrgs.value,
        undefined
      );
      return result as DistrictData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDistrictsListQuery;
