import { computed, toValue } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import useUserAdministrationAssignmentsQuery from '@/composables/queries/useUserAdministrationAssignmentsQuery';
import { runPageFetcher } from '@/helpers/query/runs';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { USER_RUN_PAGE_QUERY_KEY } from '@/constants/queryKeys';

interface Assessment {
  taskId: string;
  optional: boolean;
}

interface RunPageTask {
  taskId: string;
  reliable: boolean;
  engagementFlags: any;
  optional: boolean;
  scores: {
    computed: any;
  };
}

interface QueryOptions {
  enabled?: boolean;
  [key: string]: any;
}

interface RunPageQueryParams {
  userId: string | undefined;
  administrationId: string;
  orgType: string;
  orgId: string;
  queryOptions?: QueryOptions;
}

/**
 * User run page query
 *
 * @TODO: Evaluate whether this query can be replaced using more generic query that already fetches user assessments and
 * scores. This query was implemented as part of the transition to query composables but might be redudant if we
 * refactor the underlying database query helpers to fetch all necessary data in a single query.
 *
 * @param {string|undefined} userId – The user ID to fetch, set to undefined to fetch the current user.
 * @param {string} administrationId – The administration ID.
 * @param {string} orgType – The organization type.
 * @param {string} orgId – The organization ID.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useUserRunPageQuery = ({
  userId,
  administrationId,
  orgType,
  orgId,
  queryOptions = undefined,
}: RunPageQueryParams) => {
  const { data: assignmentData } = useUserAdministrationAssignmentsQuery(userId || '', administrationId, {
    enabled: queryOptions?.enabled ?? true,
  });

  const optionalAssessments = computed(() => {
    return assignmentData?.value?.assessments.filter((assessment: Assessment) => assessment.optional);
  });

  const queryConditions = [
    () => !!toValue(userId),
    () => !!toValue(administrationId),
    () => !!toValue(orgType),
    () => !!toValue(orgId),
    () => !_isEmpty(assignmentData.value),
  ];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [USER_RUN_PAGE_QUERY_KEY, userId, administrationId, orgType, orgId],
    queryFn: async () => {
      const runPageData = await runPageFetcher({
        administrationId: administrationId,
        orgType: orgType,
        orgId: orgId,
        userId: userId || undefined,
        select: ['scores.computed', 'taskId', 'reliable', 'engagementFlags', 'optional'],
        scoreKey: 'scores.computed',
        paginate: false,
      });

      const data = runPageData?.map((task: any) => {
        const isOptional = optionalAssessments?.value?.some(
          (assessment: Assessment) => assessment.taskId === task.taskId
        );
        return isOptional ? { ...task, optional: true } : task;
      });

      return data as RunPageTask[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useUserRunPageQuery; 