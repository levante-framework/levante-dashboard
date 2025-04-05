import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { computed, Ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchDocById } from '@/helpers/query/utils';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { MaybeRef } from 'vue';

interface UserClaimsData {
  id?: string;
  claims?: Record<string, any>;
  [key: string]: any;
}

interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

/**
 * User claims data query.
 *
 * @param {QueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<UserClaimsData, Error>} The TanStack query result.
 */
const useUserClaimsQuery = (
  queryOptions: QueryOptions = {}
): UseQueryReturnType<UserClaimsData, Error> => {
  const authStore = useAuthStore();
  const { uid }: { uid: Ref<string | undefined> } = storeToRefs(authStore);

  const queryConditions = [() => !!uid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  const queryKey = computed(() => [USER_CLAIMS_QUERY_KEY, uid.value]);

  return useQuery<UserClaimsData, Error>({
    queryKey,
    queryFn: async () => {
      if (!uid.value) {
        throw new Error('User UID is not available to fetch claims.');
      }
      const data = await fetchDocById(FIRESTORE_COLLECTIONS.USER_CLAIMS, uid.value);
      return data as UserClaimsData;
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserClaimsQuery; 