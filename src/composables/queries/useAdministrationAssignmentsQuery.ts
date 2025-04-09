import { type MaybeRef, unref, computed } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { assignmentFetchAll } from '@/helpers/query/assignments';
import { ADMINISTRATION_ASSIGNMENTS_QUERY_KEY } from '@/constants/queryKeys';

// Adjust type based on linter error message
interface AdminAssignmentData {
  roarUid: string; // Use roarUid as identifier?
  id?: string; // Keep optional id if needed elsewhere
  survey?: any;
  assignment?: Record<string, any>; // Use Record<string, any> for NumericDictionary
  user?: any;
  [key: string]: any;
}

// Use a simpler options type, explicitly omitting enabled
type AdminAssignmentsQueryOptions = Omit<
  UseQueryOptions<AdminAssignmentData[], Error, AdminAssignmentData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * Administration assignments query.
 *
 * @param {MaybeRef<string | undefined>} administrationId – The administration ID.
 * @param {MaybeRef<string | undefined>} orgType – The organisation type.
 * @param {MaybeRef<string | undefined>} orgId – The organisation ID.
 * @param {MaybeRef<boolean | undefined>} enabled - Explicit enabled state.
 * @param {AdminAssignmentsQueryOptions | undefined} queryOptions – Optional TanStack query options (excluding enabled).
 * @returns {UseQueryReturnType<AdminAssignmentData[], Error>} The TanStack query result.
 */
const useAdministrationAssignmentsQuery = (
  administrationId: MaybeRef<string | undefined>,
  orgType: MaybeRef<string | undefined>,
  orgId: MaybeRef<string | undefined>,
  enabled: MaybeRef<boolean | undefined> = true,
  queryOptions: AdminAssignmentsQueryOptions = {},
): UseQueryReturnType<AdminAssignmentData[], Error> => {
  const authStore = useAuthStore();
  const { roarUid } = storeToRefs(authStore);

  const queryConditions: Condition[] = [
    () => !!unref(administrationId),
    () => !!unref(orgType),
    () => !!unref(orgId),
    () => !!unref(roarUid),
    () => unref(enabled) ?? true,
  ];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  // Construct query key reactively
  const queryKey = computed(() => [
    ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
    unref(administrationId),
    `${unref(orgType)}-${unref(orgId)}`,
  ]);

  return useQuery<AdminAssignmentData[], Error, AdminAssignmentData[], ReadonlyArray<unknown>>({
    queryKey: queryKey,
    queryFn: async (): Promise<AdminAssignmentData[]> => {
      const currentAdminId = unref(administrationId);
      const currentOrgType = unref(orgType);
      const currentOrgId = unref(orgId);

      if (!currentAdminId || !currentOrgType || !currentOrgId) {
        return Promise.resolve([]);
      }
      const result = await assignmentFetchAll(currentAdminId, currentOrgType, currentOrgId, true);
      return result as AdminAssignmentData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useAdministrationAssignmentsQuery;
