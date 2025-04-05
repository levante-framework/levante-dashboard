import { useQuery, UseQueryReturnType, QueryKey } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { computed, Ref, MaybeRef, toValue } from 'vue';
import { useAuthStore } from '@/store/auth';
import { fetchSubcollection, DocumentData } from '@/helpers/query/utils'; // Assuming DocumentData is exported
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides.ts';
import { SURVEY_RESPONSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Define QueryOptions structure
interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

// Define SurveyResponse structure (adjust based on actual data)
interface SurveyResponse extends DocumentData { // Extend DocumentData
  // Add expected survey response fields
  response?: Record<string, any>;
  timestamp?: any; // Use specific Timestamp type if available
  [key: string]: any;
}

/**
 * Survey responses query.
 *
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<SurveyResponse[], Error>} The TanStack query result.
 */
const useSurveyResponsesQuery = (
  queryOptions: QueryOptions = {}
): UseQueryReturnType<SurveyResponse[], Error> => {
  const authStore = useAuthStore();
  // Explicitly type roarUid ref
  const { roarUid }: { roarUid: Ref<string | undefined> } = storeToRefs(authStore);

  const queryConditions = [() => !!roarUid.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  const queryKey = computed(() => [
    SURVEY_RESPONSES_QUERY_KEY,
    roarUid.value
  ] as const);

  const queryFn = async (): Promise<SurveyResponse[]> => {
    const currentRoarUid = roarUid.value;
    if (!currentRoarUid) {
      console.warn('useSurveyResponsesQuery: roarUid not available.');
      return []; // Return empty if no UID
    }
    const data = await fetchSubcollection(
      `${FIRESTORE_COLLECTIONS.USERS}/${currentRoarUid}`,
      'surveyResponses'
    );
    // Ensure data is an array before casting
    return Array.isArray(data) ? (data as SurveyResponse[]) : [];
  };

  return useQuery<SurveyResponse[], Error>({
    queryKey,
    queryFn,
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useSurveyResponsesQuery; 