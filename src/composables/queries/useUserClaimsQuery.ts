import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { computed, type Ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { fetchDocById } from '@/helpers/query/utils';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Define and export the shared UserClaimsData interface
export interface UserClaimsData {
  claims?: {
    adminOrgs?: Record<string, any>; // Or a more specific type if known
    super_admin?: boolean;
    admin?: boolean; // Seen in auth store getter, might be in claims
    minimalAdminOrgs?: Record<string, string[]>; // Seen in useUserType
    roarUid?: string; // Seen in auth store getter
    // Add other claim properties if they exist
  };
  // Add other top-level properties if they exist in the user_claims document
}

// Define specific query options type
type UserClaimsQueryOptions = Omit<
  UseQueryOptions<UserClaimsData | null, Error, UserClaimsData | null, ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * User claims data query.
 *
 * @param {UserClaimsQueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<UserClaimsData | null, Error>} The TanStack query result.
 */
const useUserClaimsQuery = (
  queryOptions: UserClaimsQueryOptions = {},
): UseQueryReturnType<UserClaimsData | null, Error> => {
  const authStore = useAuthStore();
  // uid from store is Ref<string | undefined>
  const { uid } = storeToRefs(authStore);

  // query condition needs to return boolean
  const queryConditions: Condition[] = [() => !!uid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<UserClaimsData | null, Error, UserClaimsData | null, ReadonlyArray<unknown>>({
    // Pass uid ref directly into query key array
    queryKey: [USER_CLAIMS_QUERY_KEY, uid],
    queryFn: async (): Promise<UserClaimsData | null> => {
      const currentUid = uid.value;
      if (!currentUid) {
        // console.log('[useUserClaimsQuery] No UID available, skipping fetch.');
        return Promise.resolve(null);
      }
      // console.log(`[useUserClaimsQuery] Fetching claims for UID: ${currentUid}`);
      // Ensure fetchDocById returns the correct type or cast
      const result = await fetchDocById(FIRESTORE_COLLECTIONS.USER_CLAIMS, currentUid);
      // Log the raw result before casting/returning
      // console.log('[useUserClaimsQuery] Raw result from fetchDocById:', result);
      return result as UserClaimsData | null;
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserClaimsQuery;
