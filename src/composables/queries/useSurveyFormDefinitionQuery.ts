import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { SURVEY_FORM_DEFINITION_QUERY_KEY } from '@/constants/queryKeys';
import {
  surveyFormsRepository,
  type SurveyFormDefinition,
} from '@/firebase/repositories/SurveyFormsRepository';

export type SurveyFormType = 'school' | 'site';

/**
 * Fetches the registered survey definition (field list) for the given form type
 * via the `buildSchoolSurvey` / `buildSiteSurvey` callables.
 */
export const useSurveyFormDefinitionQuery = (
  formType: MaybeRefOrGetter<SurveyFormType>,
  enabled: MaybeRefOrGetter<boolean> = true,
) => {
  return useQuery<SurveyFormDefinition>({
    queryKey: computed(() => [SURVEY_FORM_DEFINITION_QUERY_KEY, toValue(formType)]),
    queryFn: () => {
      return toValue(formType) === 'school'
        ? surveyFormsRepository.buildSchoolSurvey()
        : surveyFormsRepository.buildSiteSurvey();
    },
    enabled: () => toValue(enabled),
    staleTime: Infinity,
  });
};
