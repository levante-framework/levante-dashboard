import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { SURVEY_FORM_DEFINITION_QUERY_KEY } from '@/constants/queryKeys';
import { type SurveyFormDefinition, surveyFormsRepository } from '@/firebase/repositories/SurveyFormsRepository';

export type SurveyFormType = 'school' | 'site';

/**
 * Fetches the registered survey definition via `loadFormDefinitions`.
 */
export const useSurveyFormDefinitionQuery = (
  formType: MaybeRefOrGetter<SurveyFormType>,
  orgId: MaybeRefOrGetter<string> = 'preview',
  enabled: MaybeRefOrGetter<boolean> = true,
) => {
  return useQuery<SurveyFormDefinition>({
    queryKey: computed(() => [SURVEY_FORM_DEFINITION_QUERY_KEY, toValue(formType), toValue(orgId)]),
    queryFn: () => surveyFormsRepository.loadFormDefinitions(toValue(formType), toValue(orgId)),
    enabled: () => toValue(enabled),
    staleTime: Infinity,
  });
};
