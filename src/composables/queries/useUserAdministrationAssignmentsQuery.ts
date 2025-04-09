import { toValue, type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { fetchDocById } from '@/helpers/query/utils'; // Assume returns UserAdminAssignmentData | null
import { USER_ADMINISTRATION_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for user administration assignment data
export interface UserAdminAssignmentData {
  id: string;
  // Add other expected properties
  status?: string;
  taskResponses?: Record<string, any>;
  [key: string]: any;
}

// Define specific query options type
type UserAdminAssignmentsQueryOptions = Omit<
  UseQueryOptions<UserAdminAssignmentData | null, Error, UserAdminAssignmentData | null, ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * User administration assignments query.
 *
 * @param {MaybeRef<string | undefined>} userId – The user ID to fetch assignments for.
 * @param {MaybeRef<string | undefined>} administrationId – The administration ID to fetch assignments for.
 * @param {UserAdminAssignmentsQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<UserAdminAssignmentData | null, Error>} The TanStack query result.
 */
const useUserAdministrationAssignmentsQuery = (
  userId: MaybeRef<string | undefined>,
  administrationId: MaybeRef<string | undefined>,
  queryOptions: UserAdminAssignmentsQueryOptions = {},
): UseQueryReturnType<UserAdminAssignmentData | null, Error> => {
  const queryConditions: Condition[] = [() => !!unref(userId), () => !!unref(administrationId)];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<UserAdminAssignmentData | null, Error, UserAdminAssignmentData | null, ReadonlyArray<unknown>>({
    // Pass refs directly into query key
    queryKey: [USER_ADMINISTRATION_ASSIGNMENTS_QUERY_KEY, userId, administrationId],
    queryFn: async (): Promise<UserAdminAssignmentData | null> => {
      const currentUserId = unref(userId);
      const currentAdminId = unref(administrationId);

      if (!currentUserId || !currentAdminId) {
        // If IDs are missing, cannot fetch the doc
        return Promise.resolve(null);
      }
      // Construct the document path
      const docPath = `${currentUserId}/assignments/${currentAdminId}`;
      // Ensure fetchDocById returns the correct type or cast
      const result = await fetchDocById(FIRESTORE_COLLECTIONS.USERS, docPath);
      return result as UserAdminAssignmentData | null;
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserAdministrationAssignmentsQuery;
