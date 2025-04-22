import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import { computed, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - JS Helper
import { fetchSubcollection } from '@/helpers/query/utils';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { SURVEY_RESPONSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for a survey response document
interface SurveyResponse {
    id: string;
    // Add known fields from survey response documents
    [key: string]: any;
}

/**
 * Survey responses query.
 *
 * Fetches all survey responses for the currently authenticated user.
 *
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useSurveyResponsesQuery = (
    queryOptions?: QueryOptions<SurveyResponse[], Error>
): UseQueryReturnType<SurveyResponse[], Error> => {

  const authStore = useAuthStore();
  const { roarUid } = storeToRefs(authStore);

  // Query is enabled only if roarUid has a value
  const queryConditions = [(): boolean => !!roarUid.value];
  const { isQueryEnabled } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  const queryKey = computed<QueryKey>(() => [
      SURVEY_RESPONSES_QUERY_KEY,
      roarUid.value // Include UID in key
  ]);

  return useQuery<SurveyResponse[], Error>({
    // Use computed queryKey ref
    queryKey,
    // Assuming fetchSubcollection returns Promise<SurveyResponse[]>
    queryFn: () => {
        if (!roarUid.value) {
            // Should not happen if enabled is working, but return empty array for safety
            return Promise.resolve([]);
        }
        return fetchSubcollection(
            `${FIRESTORE_COLLECTIONS.USERS}/${roarUid.value}`,
            'surveyResponses' // Subcollection name
        );
    },
    enabled: isQueryEnabled,
    // Cast spread options to any to bypass type checking issues
    ...(queryOptions as any),
  });
};

export default useSurveyResponsesQuery; 