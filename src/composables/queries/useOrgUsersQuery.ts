import { computed, Ref, ComputedRef, MaybeRef, toValue } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserType, { UserTypeInfo } from '@/composables/useUserType.ts';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery.ts';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { orgFetcher } from '@/helpers/query/orgs'; // Assuming typed
import { ORG_USERS_QUERY_KEY, USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { DocumentData } from '@/helpers/query/utils';

// Define QueryOptions
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define AdminOrgs
interface AdminOrgs {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

// Define UserData (reuse or import)
interface UserData extends DocumentData {
  name?: { first?: string; middle?: string; last?: string };
  email?: string;
  username?: string;
  [key: string]: any;
}

/**
 * Org Users query.
 *
 * Fetches users belonging to a specific organization.
 *
 * @param {MaybeRef<string>} orgType – The type of the organization (e.g., 'districts', 'schools').
 * @param {MaybeRef<string>} orgId – The ID of the organization.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<UserData[], Error>} The TanStack query result.
 */
const useOrgUsersQuery = (
  orgType: MaybeRef<string>,
  orgId: MaybeRef<string>,
  queryOptions: QueryOptions = {}
): UseQueryReturnType<UserData[], Error> => {

  const { data: userClaims } = useUserClaimsQuery({
    queryKey: [USER_CLAIMS_QUERY_KEY],
    enabled: computed(() => toValue(queryOptions?.enabled ?? true)),
  });

  const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
  const isSuperAdmin: ComputedRef<boolean> = userTypeInfo.isSuperAdmin;
  const adminOrgs: ComputedRef<AdminOrgs> = computed(() => userClaims.value?.claims?.minimalAdminOrgs || {});

  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));
  // Conditions depend on orgType and orgId being present, plus claims
  const queryConditions = [
    () => !!toValue(orgType),
    () => !!toValue(orgId),
    () => claimsLoaded.value
  ];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  const queryKey = computed(() => [
    ORG_USERS_QUERY_KEY,
    toValue(orgType),
    toValue(orgId)
  ] as const);

  const queryFn = async (): Promise<UserData[]> => {
    const currentOrgId = toValue(orgId);
    if (!currentOrgId) return []; // Need orgId

    // Note: orgFetcher fetches ORGS, not USERS. This might be incorrect.
    // Assuming there should be a userFetcher or similar helper.
    // Using orgFetcher for now based on the original code, but this needs verification.
    console.warn('useOrgUsersQuery: Verify orgFetcher is the correct function to fetch users by org.');
    const data = await orgFetcher(
      FIRESTORE_COLLECTIONS.USERS, // Fetching from USERS collection
      currentOrgId, // Assuming orgFetcher uses parentId for filtering?
      isSuperAdmin.value,
      adminOrgs
    );
    return Array.isArray(data) ? (data as UserData[]) : [];
  };

  return useQuery<UserData[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useOrgUsersQuery; 