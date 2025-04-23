import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { computed, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { fetchDocById } from '@/helpers/query/utils';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Define a basic structure for user claims data
// Refine based on the actual structure of documents in the 'user_claims' collection
export interface UserClaimsData {
    id?: string; // fetchDocById might add the id
    claims?: Record<string, any>; // The nested claims object
    // Add other top-level fields if they exist
    [key: string]: any;
}

/**
 * User claims data query.
 *
 * Fetches the claims document for the currently authenticated user.
 *
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUserClaimsQuery = (
    queryOptions?: QueryOptions<UserClaimsData | null, Error> // Return type can be data or null
): UseQueryReturnType<UserClaimsData | null, Error> => {

  const authStore = useAuthStore();
  // Assuming uid from store is Ref<string | undefined | null>
  const { uid } = storeToRefs(authStore);

  // Query is enabled only if uid has a value
  const queryConditions = [(): boolean => !!uid.value];
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Query key depends on the user ID
  const queryKey = computed<QueryKey>(() => [
      USER_CLAIMS_QUERY_KEY,
      uid.value
  ]);

  return useQuery<UserClaimsData | null, Error>({
    queryKey,
    queryFn: () => {
        if (!uid.value) {
             // Should not happen if enabled is working, but return null for safety
            return Promise.resolve(null);
        }
        // Assuming fetchDocById returns Promise<UserClaimsData | null>
        return fetchDocById(
            FIRESTORE_COLLECTIONS.USER_CLAIMS,
            uid.value
            // No select fields specified, fetches the whole document
        );
    },
    enabled: isQueryEnabled,
    // Cast spread options to any to bypass type checking issues
    ...(queryOptions as any),
  });
};

export default useUserClaimsQuery; 
