import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import FormRenderer from '@/components/FormRenderer.vue';
import { useSurveyFormDefinitionQuery } from '@/composables/queries/useSurveyFormDefinitionQuery';
import { SURVEY_FORM_DEFINITION_QUERY_KEY } from '@/constants/queryKeys';
import { surveyFormsRepository } from '@/firebase/repositories/SurveyFormsRepository';
import SurveyFormPreview from './SurveyFormPreview.vue';

const route = vi.hoisted(() => ({
  params: { formType: 'site' as string },
  query: { orgId: 'district-1' as string },
}));

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/firebase/repositories/SurveyFormsRepository', () => ({
  surveyFormsRepository: {
    saveOrgInformation: vi.fn(),
  },
}));

vi.mock('@/composables/queries/useSurveyFormDefinitionQuery', () => ({
  useSurveyFormDefinitionQuery: vi.fn(),
}));

const FIELD = {
  itemId: 'site_02',
  variableName: 'siteRecruitment',
  kind: 'text' as const,
  required: true,
  sectionId: 'recruitment',
  questionText: 'Recruitment notes',
};

function mockQuery(savedResponses: unknown[]) {
  vi.mocked(useSurveyFormDefinitionQuery).mockReturnValue({
    data: ref({
      formId: 'siteInformation',
      versionId: 'v1',
      versionNumber: 1,
      formDescription: '',
      fieldsDescription: {},
      generalPrompt: 'Please complete.',
      sectionInfo: [{ sectionId: 'recruitment', title: 'Recruitment', description: '' }],
      fullFields: [FIELD],
      orgType: 'site',
      orgId: 'district-1',
      savedResponses,
    }),
    isLoading: ref(false),
    isError: ref(false),
    error: ref(null),
  } as unknown as ReturnType<typeof useSurveyFormDefinitionQuery>);
}

function mountPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = mount(SurveyFormPreview, {
    global: {
      plugins: [PrimeVue, [VueQueryPlugin, { queryClient }]],
      directives: { tooltip: Tooltip },
      stubs: { Dialog: true },
    },
  });
  return { wrapper, queryClient };
}

function buttonByLabel(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((button) => button.text().includes(label));
  if (!match) throw new Error(`Button "${label}" was not found`);
  return match;
}

async function saveCurrentPage(wrapper: VueWrapper) {
  await buttonByLabel(wrapper, 'Get started').trigger('click');
  await flushPromises();
  await buttonByLabel(wrapper, 'Save').trigger('click');
  await flushPromises();
}

describe('SurveyFormPreview', () => {
  beforeEach(() => {
    route.params.formType = 'site';
    route.query.orgId = 'district-1';
  });

  it('passes savedResponses[0].responses to FormRenderer', () => {
    const responses = { siteRecruitment: 'email' };
    mockQuery([{ formVersion: 'v1', status: 'draft', responses }]);

    const wrapper = mountPage().wrapper;

    expect(wrapper.getComponent(FormRenderer).props('initialResponses')).toEqual(responses);
  });

  it('does not prefill when there are no saved responses', () => {
    mockQuery([]);

    const wrapper = mountPage().wrapper;

    expect(wrapper.getComponent(FormRenderer).props('initialResponses')).toBeUndefined();
  });

  it('saves as complete when the stored form is already complete', async () => {
    vi.mocked(surveyFormsRepository.saveOrgInformation).mockResolvedValue({
      orgType: 'site',
      orgId: 'district-1',
      formVersion: 'v1',
      status: 'complete',
      path: 'districts/district-1/siteInformation/v1',
    });
    mockQuery([{ formVersion: 'v1', status: 'complete', responses: { siteRecruitment: 'email' } }]);

    const { wrapper, queryClient } = mountPage();
    await saveCurrentPage(wrapper);

    expect(surveyFormsRepository.saveOrgInformation).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'complete' }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [SURVEY_FORM_DEFINITION_QUERY_KEY, 'site', 'district-1'],
    });
  });

  it('saves as draft when the stored form is still a draft', async () => {
    vi.mocked(surveyFormsRepository.saveOrgInformation).mockResolvedValue({
      orgType: 'site',
      orgId: 'district-1',
      formVersion: 'v1',
      status: 'draft',
      path: 'districts/district-1/siteInformation/v1',
    });
    mockQuery([{ formVersion: 'v1', status: 'draft', responses: { siteRecruitment: 'email' } }]);

    const { wrapper, queryClient } = mountPage();
    await saveCurrentPage(wrapper);

    expect(surveyFormsRepository.saveOrgInformation).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [SURVEY_FORM_DEFINITION_QUERY_KEY, 'site', 'district-1'],
    });
  });
});
