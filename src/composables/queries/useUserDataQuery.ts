import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { fetchDocById } from '@/helpers/query/utils';
import { USER_DATA_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Define the structure for the fetched user data
// Based on UserUpdateData from useUpdateUserMutation, but fields are likely required here
interface UserData {
    id: string; // Assuming fetchDocById adds the id
    firstName?: string;
    lastName?: string;
    email?: string;
    birthMonth?: string | number;
    birthYear?: string | number;
    grade?: string | number;
    notes?: string;
    // Add other user fields
    [key: string]: any;
}

/**
 * User profile data query.
 *
 * @param userId – The user ID to fetch, set to null/undefined to fetch the current user.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUserDataQuery = (
    userId: string | null | undefined = undefined,
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<UserData | null, Error> => { // Return type can be UserData or null
  
  const authStore = useAuthStore();
  const { roarUid } = storeToRefs(authStore);

  // Determine the target UID, prioritizing passed userId
  const uid = computed<string | null | undefined>(() => userId ?? roarUid.value);
  
  // Query is enabled only if a valid UID is determined
  const queryConditions = [(): boolean => !!uid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Compute query key dynamically
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      USER_DATA_QUERY_KEY, 
      uid.value // Include the determined UID in the key
  ]);

  return useQuery<UserData | null, Error>({
    queryKey,
    // Adjust queryFn return type handling
    queryFn: async (): Promise<UserData | null> => {
        const currentUid = uid.value;
        if (!currentUid) {
            return Promise.resolve(null);
        }
        const doc = await fetchDocById(
            FIRESTORE_COLLECTIONS.USERS, 
            currentUid
        );

        // Check if the fetched doc is valid and has an ID
        if (doc && typeof doc === 'object' && 'id' in doc && doc.id) {
           // Assume doc has at least id, spread other props
           // Cast to UserData if confident about the structure
           return doc as UserData; 
        } else if (doc && typeof doc === 'object' && !Object.keys(doc).length) {
            // Handle case where an empty object might be returned
            console.warn(`fetchDocById returned empty object for UID: ${currentUid}`);
            return null;
        } else {
            // Handle other unexpected return types or null/undefined
            console.warn(`fetchDocById returned unexpected data for UID: ${currentUid}`, doc);
            return null;
        }
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserDataQuery; 