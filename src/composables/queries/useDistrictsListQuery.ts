import { computed, Ref, ComputedRef, MaybeRef, toValue } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { orgFetcher } from '@/helpers/query/orgs';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery.ts';
import useUserType, { UserTypeInfo } from '@/composables/useUserType.ts';
import { DISTRICTS_LIST_QUERY_KEY, USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define AdminOrgs structure (based on usage)
interface AdminOrgs {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

// Define District structure (adjust based on actual data)
interface District {
  id: string;
  name?: string;
  // Add other district fields
  [key: string]: any;
}

/**
 * Districts List query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<District[], Error>} The TanStack query result.
 */
const useDistrictsListQuery = (
  queryOptions: QueryOptions = {}
): UseQueryReturnType<District[], Error> => {

  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    // Add queryKey for userClaims query
    queryKey: [USER_CLAIMS_QUERY_KEY],
    enabled: computed(() => toValue(queryOptions?.enabled ?? true)),
  });

  // Get admin status and administration orgs.
  const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
  const isSuperAdmin: ComputedRef<boolean> = userTypeInfo.isSuperAdmin;
  // Provide default empty object if minimalAdminOrgs is undefined
  const administrationOrgs: ComputedRef<AdminOrgs> = computed(() => userClaims.value?.claims?.minimalAdminOrgs || {});

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));

  // Directly compute the final enabled state
  const finalEnabled = computed(() => {
    const passedEnabled = toValue(queryOptions?.enabled ?? true);
    return passedEnabled && claimsLoaded.value;
  });

  const queryKey = computed(() => [DISTRICTS_LIST_QUERY_KEY] as const);

  // Type the queryFn
  const queryFn = async (): Promise<District[]> => {
    const data = await orgFetcher(
        FIRESTORE_COLLECTIONS.DISTRICTS,
        undefined,
        isSuperAdmin.value,
        administrationOrgs
    );
    return Array.isArray(data) ? (data as District[]) : [];
  };

  return useQuery<District[], Error>({
    queryKey,
    queryFn,
    enabled: finalEnabled,
    ...(queryOptions ?? {}),
  });
};

export default useDistrictsListQuery; 