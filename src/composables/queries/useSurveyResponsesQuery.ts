import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { fetchSubcollection } from '@/helpers/query/utils';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { SURVEY_RESPONSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for survey response data
interface SurveyResponseData {
  id: string;
  // Add other expected properties from survey response documents
  [key: string]: any;
}

// Define specific query options type
type SurveyResponsesQueryOptions = Omit<
  UseQueryOptions<SurveyResponseData[], Error, SurveyResponseData[], ReadonlyArray<string>>,
  'queryKey' | 'queryFn' | 'enabled' // Keep enabled if passed directly to computeQueryOverrides
>;

/**
 * Survey responses query.
 *
 * @param {SurveyResponsesQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<SurveyResponseData[], Error>} The TanStack query result.
 */
const useSurveyResponsesQuery = (
  queryOptions: SurveyResponsesQueryOptions = {},
): UseQueryReturnType<SurveyResponseData[], Error> => {
  const authStore = useAuthStore();
  // roarUid is Ref<string | undefined>
  const { roarUid } = storeToRefs(authStore);

  const queryConditions: Condition[] = [() => !!roarUid.value];
  // Pass queryOptions directly, computeQueryOverrides should handle the 'enabled' property from it
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<SurveyResponseData[], Error, SurveyResponseData[], ReadonlyArray<string>>({
    queryKey: [SURVEY_RESPONSES_QUERY_KEY],
    queryFn: async (): Promise<SurveyResponseData[]> => {
      const currentRoarUid = roarUid.value;
      if (!currentRoarUid) {
        // If roarUid is not available, maybe return empty array or throw?
        // Returning empty array to match potential original behavior.
        return Promise.resolve([]);
      }
      // Ensure fetchSubcollection returns the correct type or cast
      const result = await fetchSubcollection(
        `${FIRESTORE_COLLECTIONS.USERS}/${currentRoarUid}`,
        'surveyResponses',
      );
      return result as SurveyResponseData[];
    },
    enabled: isQueryEnabled, // Use the computed enabled state
    ...options, // Spread the rest of the computed options
  });
};

export default useSurveyResponsesQuery;
