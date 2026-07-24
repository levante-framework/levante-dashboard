import { type UseQueryOptions, type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { SURVEY_RESPONSES_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchSubcollection } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';

/**
 * Survey responses query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryResult} The TanStack query result.
 */
const useSurveyResponsesQuery = (queryOptions?: UseQueryOptions): UseQueryReturnType => {
  const authStore = useAuthStore();
  const { getUserId } = authStore;

  const queryConditions = [() => !!getUserId()];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [SURVEY_RESPONSES_QUERY_KEY],
    queryFn: () => fetchSubcollection(`${FIRESTORE_COLLECTIONS.USERS}/${getUserId()}`, 'surveyResponses'),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useSurveyResponsesQuery;
