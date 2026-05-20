import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
import axios from 'axios';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';

export interface SurveyOption {
  id: string;
  name: string;
}

const fetchSurvey = async (bucketUrl?: string, surveyId?: string) => {
  if (!bucketUrl || !surveyId) return null;

  return axios
    .get<Record<string, unknown>>(`${bucketUrl}/${surveyId}.json`)
    .then((response) => response.data)
    .catch((error) => {
      console.error(`Failed to fetch survey ${surveyId}`, error);
      throw error;
    });
};

export const useSurveyQuery = (
  bucketUrl?: MaybeRefOrGetter<string | undefined>,
  surveyId?: MaybeRefOrGetter<string | undefined>,
): UseQueryReturnType<Record<string, unknown>, Error> => {
  return useQuery({
    queryKey: computed(() => ['survey', toValue(bucketUrl), toValue(surveyId)]),
    queryFn: () => fetchSurvey(toValue(bucketUrl), toValue(surveyId)),
    enabled: computed(() => !!toValue(surveyId)),
  });
};
