import { computed, Ref, ComputedRef, MaybeRef, toValue } from 'vue';
import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { orgFetcher } from '@/helpers/query/orgs';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery.ts';
import useUserType, { UserTypeInfo } from '@/composables/useUserType.ts';
import { GROUPS_LIST_QUERY_KEY, USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
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

interface GroupData extends DocumentData {
  name?: string;
  [key: string]: any;
}

/**
 * Groups List query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<GroupData[], Error>} The TanStack query result.
 */
const useGroupsListQuery = (
  queryOptions: QueryOptions = {}
): UseQueryReturnType<GroupData[], Error> => {
  const { data: userClaims } = useUserClaimsQuery({
    queryKey: [USER_CLAIMS_QUERY_KEY],
    enabled: computed(() => toValue(queryOptions?.enabled ?? true)),
  });

  const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
  const isSuperAdmin: ComputedRef<boolean> = userTypeInfo.isSuperAdmin;
  const administrationOrgs: ComputedRef<AdminOrgs> = computed(() => userClaims.value?.claims?.minimalAdminOrgs || {});

  const claimsLoaded = computed(() => !_isEmpty(userClaims?.value?.claims));

  const finalEnabled = computed(() => {
    const passedEnabled = toValue(queryOptions?.enabled ?? true);
    return passedEnabled && claimsLoaded.value;
  });

  const queryKey = computed(() => [GROUPS_LIST_QUERY_KEY] as const);

  const queryFn = async (): Promise<GroupData[]> => {
    const data = await orgFetcher(
      FIRESTORE_COLLECTIONS.GROUPS,
      undefined,
      isSuperAdmin.value,
      administrationOrgs
    );
    return Array.isArray(data) ? (data as GroupData[]) : [];
  };

  return useQuery<GroupData[], Error>({
    queryKey,
    queryFn,
    enabled: finalEnabled,
    ...(queryOptions ?? {}),
  });
};

export default useGroupsListQuery; 