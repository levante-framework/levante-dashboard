import { computed, type MaybeRef, type ComputedRef, toValue, ref } from 'vue';
import { useQuery, type UseQueryOptions, type UseQueryReturnType, type QueryKey } from '@tanstack/vue-query';
// @ts-ignore - This composable needs conversion
import useUserAdministrationAssignmentsQuery from '@/composables/queries/useUserAdministrationAssignmentsQuery.js';
// @ts-ignore - runPageFetcher likely needs type refinement, import specific type
import { runPageFetcher, type RunWithUserData } from '@/helpers/query/runs';
// @ts-ignore - computeQueryOverrides needs conversion
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - hasArrayEntries needs conversion
import { hasArrayEntries } from '@/helpers/hasArrayEntries';
import { USER_RUN_PAGE_QUERY_KEY } from '@/constants/queryKeys';

// Assuming Assignment type from useUserAdministrationAssignmentsQuery
interface Assignment {
  taskId: string;
  optional?: boolean;
  // Add other fields if known
  [key: string]: any;
}

interface AssignmentData {
  assessments: Assignment[];
  // Add other fields if known
  [key: string]: any;
}

/**
 * User run page query
 *
 * @TODO: Evaluate whether this query can be replaced using more generic query that already fetches user assessments and
 * scores. This query was implemented as part of the transition to query composables but might be redudant if we
 * refactor the underlying database query helpers to fetch all necessary data in a single query.
 *
 * @param {MaybeRef<string | null | undefined>} userId – The user ID to fetch.
 * @param {MaybeRef<string | null | undefined>} administrationId – The administration ID.
 * @param {MaybeRef<string | null | undefined>} orgType – The organization type.
 * @param {MaybeRef<string | null | undefined>} orgId – The organization ID.
 * @param {UseQueryOptions<RunWithUserData[], Error>} [queryOptions] – Optional TanStack query options.
 * @returns {UseQueryReturnType<RunWithUserData[], Error>} The TanStack query result.
 */
function useUserRunPageQuery(
  userId: MaybeRef<string | null | undefined>,
  administrationId: MaybeRef<string | null | undefined>,
  orgType: MaybeRef<string | null | undefined>,
  orgId: MaybeRef<string | null | undefined>,
  queryOptions?: UseQueryOptions<RunWithUserData[], Error>
): UseQueryReturnType<RunWithUserData[], Error> {

  // Use computed refs for parameters, ensuring null instead of undefined for helpers
  const computedUserId = computed(() => toValue(userId) ?? null);
  const computedAdminId = computed(() => toValue(administrationId) ?? null);
  const computedOrgType = computed(() => toValue(orgType) ?? null);
  const computedOrgId = computed(() => toValue(orgId) ?? null);

  // Fetch assignment data - Use TS assertion for now
  const { data: assignmentData } = useUserAdministrationAssignmentsQuery(
      computedUserId, // Pass computed ref (now string | null)
      computedAdminId, // Pass computed ref (now string | null)
      // Pass enabled state through if provided in queryOptions
      // Ensure enabled option is passed correctly, might need { enabled: queryOptions?.enabled }
      // Let's simplify and rely on the main query's enabled flag for now.
  ) as UseQueryReturnType<AssignmentData | undefined, Error>; // Assert return type

  // Extract optional assessments
  const optionalAssessments = computed<Assignment[] | undefined>(() => {
    // Check assignmentData.value exists before accessing assessments
    return assignmentData.value?.assessments?.filter((assessment) => assessment.optional);
  });

  // Define query conditions for enabling the main query
  const queryConditions = [
    (): boolean => !!computedUserId.value,
    (): boolean => !!computedAdminId.value,
    (): boolean => !!computedOrgType.value,
    (): boolean => !!computedOrgId.value,
    // Check assignmentData.value and pass assessments array or empty array to helper
    (): boolean => hasArrayEntries(assignmentData.value?.assessments ?? []),
  ];

  // Calculate enabled state using helper (cast options to any to avoid complex type issues)
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {} as any);

  const queryKey: ComputedRef<QueryKey> = computed(() => [
    USER_RUN_PAGE_QUERY_KEY,
    computedUserId.value, // Use .value for key
    computedAdminId.value,
    computedOrgType.value,
    computedOrgId.value,
  ]);

  return useQuery<RunWithUserData[], Error>({
    queryKey,
    queryFn: async () => {
      // Pass computed refs (now matching Ref<string | null>) to fetcher
      const runPageData = await runPageFetcher({
        administrationId: computedAdminId,
        orgType: computedOrgType,
        orgId: computedOrgId,
        userId: computedUserId,
        select: ref(['scores.computed', 'taskId', 'reliable', 'engagementFlags', 'optional']),
        scoreKey: ref('scores.computed'),
        paginate: ref(false),
      });

      const data = runPageData?.map((task) => {
        const isOptional = optionalAssessments.value?.some((assessment) => assessment.taskId === task.taskId);
        return isOptional ? { ...task, optional: true } : task;
      });

      return data ?? [];
    },
    enabled: isQueryEnabled,
    // Cast spread options to any due to computeQueryOverrides interaction
    ...(queryOptions as any),
  });
}

export default useUserRunPageQuery; 