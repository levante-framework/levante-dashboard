import { LEVANTE_BUCKET_URL } from '@/constants/bucket';
import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
import axios from 'axios';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';

export interface SurveyOption {
  id: string;
  name: string;
}

export const SURVEYS: SurveyOption[] = [
  { id: 'parent_survey_child', name: 'Caregiver Child' },
  { id: 'parent_survey_family', name: 'Caregiver Family' },
  { id: 'teacher_survey_classroom', name: 'Teacher Classroom' },
  { id: 'teacher_survey_general', name: 'Teacher General' },
];

const fetchSurvey = async (surveyId: string) => {
  const trimmedSurveyId = surveyId.trim();
  const surveyIds = SURVEYS.map(({ id }: SurveyOption) => id);

  if (!surveyIds.includes(trimmedSurveyId)) {
    throw new Error(trimmedSurveyId.length ? `Invalid survey id: ${trimmedSurveyId}` : 'Survey id is required');
  }

  return axios
    .get<Record<string, unknown>>(`${LEVANTE_BUCKET_URL}/surveys/${trimmedSurveyId}.json`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(`Failed to fetch survey ${trimmedSurveyId}`, error);
      throw error;
    });
};

export const useSurveyQuery = (
  surveyId: MaybeRefOrGetter<string>,
): UseQueryReturnType<Record<string, unknown>, Error> => {
  const surveyIdValue = toValue(surveyId);
  const queryKey = computed(() => ['survey-preview', surveyIdValue]);
  return useQuery({
    queryKey,
    queryFn: () => fetchSurvey(surveyIdValue),
    enabled: !!surveyIdValue,
  });
};
