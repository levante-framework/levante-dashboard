import { computed, type MaybeRef, unref } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserAdministrationAssignmentsQuery, {
  type UserAdminAssignmentData, // Assuming this is exported
} from '@/composables/queries/useUserAdministrationAssignmentsQuery.ts'; // Import converted composable
import { runPageFetcher } from '@/helpers/query/runs'; // Assume returns RunPageData[]
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { USER_RUN_PAGE_QUERY_KEY } from '@/constants/queryKeys';

// Placeholder type for the data returned by runPageFetcher
interface RunPageData {
  taskId: string;
  scores?: { computed?: any };
  reliable?: boolean;
  engagementFlags?: any;
  optional?: boolean; // Added based on usage below
  [key: string]: any;
}

// Define the expected structure within assignmentData.value.assessments
interface AssignmentAssessment {
  taskId: string;
  optional?: boolean;
}

// Use a simpler options type for now, excluding enabled
type UserRunPageQueryOptions = Omit<
  UseQueryOptions<RunPageData[], Error, RunPageData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled' // Explicitly omit enabled here
>;

/**
 * User run page query
 *
 * @TODO: Evaluate whether this query can be replaced using more generic query that already fetches user assessments and
 * scores. This query was implemented as part of the transition to query composables but might be redudant if we
 * refactor the underlying database query helpers to fetch all necessary data in a single query.
 *
 * @param {MaybeRef<string | undefined>} userId – The user ID to fetch.
 * @param {MaybeRef<string | undefined>} administrationId – The administration ID.
 * @param {MaybeRef<string | undefined>} orgType – The organisation type.
 * @param {MaybeRef<string | undefined>} orgId – The organisation ID.
 * @param {MaybeRef<boolean | undefined>} enabled - Explicit enabled state for the query.
 * @param {UserRunPageQueryOptions | undefined} queryOptions – Optional TanStack query options (excluding enabled).
 * @returns {UseQueryReturnType<RunPageData[], Error>} The TanStack query result.
 */
const useUserRunPageQuery = (
  userId: MaybeRef<string | undefined>,
  administrationId: MaybeRef<string | undefined>,
  orgType: MaybeRef<string | undefined>,
  orgId: MaybeRef<string | undefined>,
  enabled: MaybeRef<boolean | undefined> = true, // Add enabled parameter with default
  queryOptions: UserRunPageQueryOptions = {}, // Options type no longer includes enabled
): UseQueryReturnType<RunPageData[], Error> => {
  const { data: assignmentData } = useUserAdministrationAssignmentsQuery(userId, administrationId, {
    // Pass the explicit enabled state here
    enabled: enabled ?? true,
  });

  // Type the computed property explicitly
  const optionalAssessments = computed<AssignmentAssessment[] | undefined>(() => {
    // Ensure assignmentData.value and assessments exist and filter
    return (assignmentData.value as UserAdminAssignmentData | null)?.assessments?.filter(
      (assessment: AssignmentAssessment) => assessment.optional,
    );
  });

  const queryConditions: Condition[] = [
    () => !!unref(userId),
    () => !!unref(administrationId),
    () => !!unref(orgType),
    () => !!unref(orgId),
    () => !_isEmpty(assignmentData.value), // Check the ref value
    () => unref(enabled) ?? true, // Add explicit enabled to conditions
  ];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<RunPageData[], Error, RunPageData[], ReadonlyArray<unknown>>({
    queryKey: [USER_RUN_PAGE_QUERY_KEY, userId, administrationId, orgType, orgId],
    queryFn: async (): Promise<RunPageData[]> => {
      const currentUserId = unref(userId);
      const currentAdminId = unref(administrationId);
      const currentOrgType = unref(orgType);
      const currentOrgId = unref(orgId);

      // Double check required parameters before fetcher call
      if (!currentUserId || !currentAdminId || !currentOrgType || !currentOrgId) {
        console.warn('[useUserRunPageQuery] Missing required parameters.');
        return Promise.resolve([]);
      }

      // Await the fetcher, then cast the result
      const fetchedData = await runPageFetcher({
        administrationId: currentAdminId,
        orgType: currentOrgType,
        orgId: currentOrgId,
        userId: currentUserId,
        select: ['scores.computed', 'taskId', 'reliable', 'engagementFlags', 'optional'],
        scoreKey: 'scores.computed',
        paginate: false,
      });
      const runPageData = fetchedData as RunPageData[]; // Cast here

      // Ensure runPageData is an array before mapping (runtime check)
      if (!Array.isArray(runPageData)) {
        console.warn('[useUserRunPageQuery] runPageFetcher did not return an array.');
        return [];
      }

      // Map should now work with typed runPageData
      const data = runPageData.map((task: RunPageData): RunPageData => {
        const isOptional = optionalAssessments.value?.some((assessment) => assessment.taskId === task.taskId);
        return isOptional ? { ...task, optional: true } : task;
      });

      return data;
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserRunPageQuery;
