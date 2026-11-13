import { createTestingPinia } from '@pinia/testing';
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
import { useAuthStore } from '@/store/auth';
import SurveyFormPreview from './SurveyFormPreview.vue';

const { loadFormDefinitions } = vi.hoisted(() => ({
  loadFormDefinitions: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  route: {
    params: { formType: 'site' as string },
    query: { orgId: 'district-1' as string },
  },
}));

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue');
  mocks.route = reactive({
    params: { formType: 'site' },
    query: { orgId: 'district-1' },
  });
  return {
    useRoute: () => mocks.route,
    useRouter: () => ({ push: vi.fn() }),
  };
});

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/firebase/repositories/SurveyFormsRepository', () => ({
  surveyFormsRepository: {
    loadFormDefinitions,
    saveOrgInformation: vi.fn(),
  },
}));

vi.mock('@/composables/queries/useSurveyFormDefinitionQuery', async () => {
  const actual = await vi.importActual<typeof import('@/composables/queries/useSurveyFormDefinitionQuery')>(
    '@/composables/queries/useSurveyFormDefinitionQuery',
  );
  return {
    ...actual,
    useSurveyFormDefinitionQuery: vi.fn(actual.useSurveyFormDefinitionQuery),
  };
});

const FIELD = {
  itemId: 'site_02',
  variableName: 'siteRecruitment',
  kind: 'text' as const,
  required: true,
  sectionId: 'recruitment',
  questionText: 'Recruitment notes',
};

const DEFINITION = {
  formId: 'siteInformation',
  versionId: 'v1',
  versionNumber: 1,
  formDescription: '',
  fieldsDescription: {},
  generalPrompt: 'Please complete.',
  sectionInfo: [],
  fullFields: [] as unknown[],
  orgType: 'site' as const,
  orgId: 'site-a',
  savedResponses: [] as unknown[],
};

let formMountCount = 0;

const FormRendererStub = {
  name: 'FormRenderer',
  props: ['fields', 'generalPrompt', 'sectionInfo', 'isSaving', 'isComplete', 'initialResponses', 'saveDraft'],
  emits: ['submit', 'close'],
  template: `
    <div class="form-renderer-stub">
      <button class="save" @click="saveDraft({})">Save</button>
      <button class="submit" @click="$emit('submit', {})">Submit</button>
    </div>
  `,
  created() {
    formMountCount += 1;
  },
};

function mockQuery(savedResponses?: unknown[], isError = false) {
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
      ...(savedResponses === undefined ? {} : { savedResponses }),
    }),
    isLoading: ref(false),
    isError: ref(isError),
    error: ref(isError ? new Error('Failed to load survey definition.') : null),
  } as unknown as ReturnType<typeof useSurveyFormDefinitionQuery>);
}

function mountPage(
  site: { id: string | null; name: string | null } = { id: 'district-1', name: 'District 1' },
  options?: { stubForm?: boolean },
) {
  const pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  const authStore = useAuthStore(pinia);
  authStore.currentSite = site.id;
  authStore.currentSiteName = site.name;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = mount(SurveyFormPreview, {
    global: {
      plugins: [pinia, PrimeVue, [VueQueryPlugin, { queryClient }]],
      directives: { tooltip: Tooltip },
      stubs: options?.stubForm ? { FormRenderer: FormRendererStub } : { Dialog: true },
    },
  });
  return { wrapper, queryClient, authStore };
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
    mocks.route.params.formType = 'site';
    mocks.route.query.orgId = 'district-1';
    vi.mocked(surveyFormsRepository.saveOrgInformation).mockReset();
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

  it('does not throw when savedResponses is missing', () => {
    mockQuery();

    const wrapper = mountPage().wrapper;

    expect(wrapper.getComponent(FormRenderer).props('initialResponses')).toBeUndefined();
  });

  it('keeps the form visible when a refetch errors and cached data remains', () => {
    mockQuery([{ formVersion: 'v1', status: 'draft', responses: { siteRecruitment: 'email' } }], true);

    const wrapper = mountPage().wrapper;

    expect(wrapper.getComponent(FormRenderer).exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Failed to load survey definition.');
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
      expect.objectContaining({ status: 'complete', orgId: 'district-1' }),
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

    expect(surveyFormsRepository.saveOrgInformation).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', orgId: 'district-1' }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [SURVEY_FORM_DEFINITION_QUERY_KEY, 'site', 'district-1'],
    });
  });

  it('resets complete state when the navbar site changes', async () => {
    vi.mocked(surveyFormsRepository.saveOrgInformation).mockResolvedValue({
      orgType: 'site',
      orgId: 'district-1',
      formVersion: 'v1',
      status: 'complete',
      path: 'districts/district-1/siteInformation/v1',
    });
    mockQuery([]);

    const { wrapper, authStore } = mountPage();
    await buttonByLabel(wrapper, 'Get started').trigger('click');
    await flushPromises();
    await wrapper.get('#site_02').setValue('email');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Submitted');

    authStore.currentSite = 'district-2';
    authStore.currentSiteName = 'District 2';
    await flushPromises();

    expect(wrapper.text()).not.toContain('Submitted');
    expect(wrapper.getComponent(FormRenderer).exists()).toBe(true);

    await buttonByLabel(wrapper, 'Get started').trigger('click');
    await flushPromises();
    await wrapper.get('#site_02').setValue('email');
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(surveyFormsRepository.saveOrgInformation).toHaveBeenLastCalledWith(
      expect.objectContaining({ orgId: 'district-2', status: 'draft' }),
    );
  });

  describe('navbar site', () => {
    beforeEach(async () => {
      formMountCount = 0;
      const actual = await vi.importActual<typeof import('@/composables/queries/useSurveyFormDefinitionQuery')>(
        '@/composables/queries/useSurveyFormDefinitionQuery',
      );
      vi.mocked(useSurveyFormDefinitionQuery).mockImplementation(actual.useSurveyFormDefinitionQuery);
      loadFormDefinitions.mockReset();
      loadFormDefinitions.mockImplementation(async (orgType: 'site' | 'school', orgId: string) => ({
        ...DEFINITION,
        orgType,
        orgId,
      }));
      vi.mocked(surveyFormsRepository.saveOrgInformation).mockResolvedValue({});
    });

    it('shows Select a site and does not load when All Sites is selected', async () => {
      const { wrapper } = mountPage({ id: 'any', name: 'All Sites' });
      await flushPromises();

      expect(wrapper.get('.survey-preview__title').text()).toBe('Site Information');
      expect(wrapper.text()).toContain('Select a site');
      expect(wrapper.find('.p-message-info').exists()).toBe(true);
      expect(wrapper.find('.form-renderer-stub').exists()).toBe(false);
      expect(loadFormDefinitions).not.toHaveBeenCalled();
    });

    it('shows Select a site and does not load when no site is selected', async () => {
      const { wrapper } = mountPage({ id: null, name: null });
      await flushPromises();

      expect(wrapper.get('.survey-preview__title').text()).toBe('Site Information');
      expect(wrapper.text()).toContain('Select a site');
      expect(loadFormDefinitions).not.toHaveBeenCalled();
    });

    it('loads the form after switching from All Sites to a real site', async () => {
      const { wrapper, authStore } = mountPage({ id: 'any', name: 'All Sites' });
      await flushPromises();
      expect(loadFormDefinitions).not.toHaveBeenCalled();

      authStore.currentSite = 'site-a';
      authStore.currentSiteName = 'Alpha Site';
      await flushPromises();

      expect(wrapper.text()).toContain('Site Information: Alpha Site');
      expect(wrapper.find('.p-message-info').exists()).toBe(false);
      expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-a');
    });

    it('loads the navbar site and titles the page with its name', async () => {
      const { wrapper } = mountPage({ id: 'site-a', name: 'Alpha Site' });
      await flushPromises();

      expect(wrapper.text()).toContain('Site Information: Alpha Site');
      expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-a');
    });

    it('ignores ?orgId= on the site form', async () => {
      mocks.route.query.orgId = 'from-url';
      mountPage({ id: 'site-a', name: 'Alpha Site' });
      await flushPromises();

      expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-a');
      expect(loadFormDefinitions).not.toHaveBeenCalledWith('site', 'from-url');
    });

    it('saves to the navbar site and refreshes that query', async () => {
      const { wrapper, queryClient } = mountPage({ id: 'site-a', name: 'Alpha Site' }, { stubForm: true });
      await flushPromises();
      await wrapper.get('.save').trigger('click');
      await flushPromises();

      expect(surveyFormsRepository.saveOrgInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          orgType: 'site',
          orgId: 'site-a',
        }),
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [SURVEY_FORM_DEFINITION_QUERY_KEY, 'site', 'site-a'],
      });
    });

    it('remounts the form and saves to the new site after a navbar change', async () => {
      const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' }, { stubForm: true });
      await flushPromises();
      expect(formMountCount).toBe(1);

      authStore.currentSite = 'site-b';
      authStore.currentSiteName = 'Beta Site';
      await flushPromises();

      expect(wrapper.text()).toContain('Site Information: Beta Site');
      expect(formMountCount).toBe(2);
      expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-b');

      await wrapper.get('.save').trigger('click');
      await flushPromises();
      expect(surveyFormsRepository.saveOrgInformation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orgType: 'site',
          orgId: 'site-b',
        }),
      );
    });

    it('shows Select a site and unloads the form when the navbar goes back to All Sites', async () => {
      const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' }, { stubForm: true });
      await flushPromises();
      expect(wrapper.find('.form-renderer-stub').exists()).toBe(true);
      loadFormDefinitions.mockClear();

      authStore.currentSite = 'any';
      authStore.currentSiteName = 'All Sites';
      await flushPromises();

      expect(wrapper.get('.survey-preview__title').text()).toBe('Site Information');
      expect(wrapper.text()).toContain('Select a site');
      expect(wrapper.find('.form-renderer-stub').exists()).toBe(false);
      expect(loadFormDefinitions).not.toHaveBeenCalled();
    });

    it('does not mark the new site complete if submit finishes after a navbar change', async () => {
      let finishSave: (value: unknown) => void = () => {};
      vi.mocked(surveyFormsRepository.saveOrgInformation).mockImplementation(
        () =>
          new Promise((resolve) => {
            finishSave = resolve;
          }),
      );

      const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' }, { stubForm: true });
      await flushPromises();

      await wrapper.get('.submit').trigger('click');
      authStore.currentSite = 'site-b';
      authStore.currentSiteName = 'Beta Site';
      await flushPromises();

      expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isSaving')).toBe(false);

      finishSave({});
      await flushPromises();

      expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isComplete')).toBe(false);
      expect(surveyFormsRepository.saveOrgInformation).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'site-a' }),
      );
    });

    it('shows the form again after submit if the navbar site changes', async () => {
      const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' }, { stubForm: true });
      await flushPromises();

      await wrapper.get('.submit').trigger('click');
      await flushPromises();
      expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isComplete')).toBe(true);

      authStore.currentSite = 'site-b';
      authStore.currentSiteName = 'Beta Site';
      await flushPromises();

      expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isComplete')).toBe(false);
    });

    it('loads a school form from ?orgId= and ignores the navbar site', async () => {
      mocks.route.params.formType = 'school';
      mocks.route.query.orgId = 'school-99';
      const { wrapper } = mountPage({ id: 'site-a', name: 'Alpha Site' });
      await flushPromises();

      expect(wrapper.text()).toContain('Additional School Information');
      expect(loadFormDefinitions).toHaveBeenCalledWith('school', 'school-99');
      expect(loadFormDefinitions).not.toHaveBeenCalledWith('site', 'site-a');
    });

    it('falls back to preview for a school form without ?orgId=', async () => {
      mocks.route.params.formType = 'school';
      mocks.route.query.orgId = '';
      mountPage({ id: 'site-a', name: 'Alpha Site' });
      await flushPromises();

      expect(loadFormDefinitions).toHaveBeenCalledWith('school', 'preview');
    });
  });
});
