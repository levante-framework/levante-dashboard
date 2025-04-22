import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { fetchDocById } from '@/helpers/query/utils';
import { USER_STUDENT_DATA_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Define the structure for the specifically fetched student data
interface UserStudentData {
    id?: string; // fetchDocById might add id even if not selected?
    studentData?: any; // Type this more specifically if structure is known
    birthMonth?: string | number;
    birthYear?: string | number;
    // Explicitly allow other fields potentially returned by fetchDocById despite select?
    [key: string]: any; 
}

/**
 * User student data query.
 *
 * @TODO: Evaluate whether this query can be replaced by the existing useUserDataQuery composable.
 *
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUserStudentDataQuery = (
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<UserStudentData | null, Error> => {
  
  const authStore = useAuthStore();
  // Use the actual store type with storeToRefs
  const { roarUid } = storeToRefs(authStore);

  // Ensure all necessary data is loaded before enabling the query.
  const queryConditions = [(): boolean => !!roarUid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Compute query key dynamically
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      USER_STUDENT_DATA_QUERY_KEY, 
      roarUid.value // Include the UID in the key
  ]);

  return useQuery<UserStudentData | null, Error>({
    queryKey,
    // Adjust queryFn return type handling similar to useUserDataQuery
    queryFn: async (): Promise<UserStudentData | null> => {
        const currentUid = roarUid.value;
        if (!currentUid) {
            return Promise.resolve(null);
        }
        const selectFields = ['studentData', 'birthMonth', 'birthYear'];
        const doc = await fetchDocById(
            FIRESTORE_COLLECTIONS.USERS, 
            currentUid,
            selectFields
        );

        // Handle potential return types from fetchDocById
        if (doc && typeof doc === 'object' && Object.keys(doc).length > 0) {
           // Basic check passed, cast to expected type
           return doc as UserStudentData; 
        } else if (doc && typeof doc === 'object' && Object.keys(doc).length === 0) {
           console.warn(`fetchDocById returned empty object for student data query, UID: ${currentUid}`);
           return null;
       } else {
           console.warn(`fetchDocById returned unexpected data for student data query, UID: ${currentUid}`, doc);
            return null;
       }
    },
    enabled: isQueryEnabled, 
    ...options,
  });
};

export default useUserStudentDataQuery; 