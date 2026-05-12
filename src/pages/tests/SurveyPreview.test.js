import { mount, flushPromises } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import SurveyPreview from '@/pages/SurveyPreview.vue';

const h = vi.hoisted(() => {
  const { ref } = require('vue');
  const surveyPdfSaveCalls = [];
  const surveyPdfSave = (...args) => {
    surveyPdfSaveCalls.push(args);
    return Promise.resolve();
  };
  surveyPdfSave.mockClear = () => {
    surveyPdfSaveCalls.length = 0;
  };
  surveyPdfSave.getCalls = () => surveyPdfSaveCalls;
  const mockPushCalls = [];
  const mockPush = (path) => {
    mockPushCalls.push(path);
  };
  mockPush.mockClear = () => {
    mockPushCalls.length = 0;
  };
  mockPush.getCalls = () => mockPushCalls;
  return {
    mockPush,
    mockRoute: { params: { id: '', locale: 'en' } },
    surveyData: ref(null),
    surveyError: ref(null),
    isSurveyError: ref(false),
    isSurveyLoading: ref(false),
    surveyPdfSave,
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => h.mockRoute,
  useRouter: () => ({ push: h.mockPush }),
}));

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal();
  const { ref } = await import('vue');
  return {
    ...actual,
    useI18n: () => ({
      locale: ref('en-US'),
    }),
  };
});

vi.mock('@/composables/queries/useSurveyQuery', () => ({
  SURVEYS: [
    { id: 'parent_survey_child', name: 'Caregiver Child' },
    { id: 'parent_survey_family', name: 'Caregiver Family' },
    { id: 'teacher_survey_classroom', name: 'Teacher Classroom' },
    { id: 'teacher_survey_general', name: 'Teacher General' },
  ],
  useSurveyQuery: () => ({
    data: h.surveyData,
    error: h.surveyError,
    isError: h.isSurveyError,
    isLoading: h.isSurveyLoading,
  }),
}));

vi.mock('@/helpers/survey', () => ({
  getParsedLocale: vi.fn((v) => v ?? 'en'),
}));

vi.mock('survey-core', () => ({
  Model: function ModelMock(data) {
    this.json = data;
  },
}));

vi.mock('survey-vue3-ui', () => ({
  SurveyComponent: {
    name: 'SurveyComponent',
    props: ['model'],
    template: '<div data-testid="survey-component" />',
  },
}));

vi.mock('survey-pdf', () => ({
  SurveyPDF: vi.fn(function SurveyPDFMock() {
    this.save = h.surveyPdfSave;
  }),
}));

import { SurveyPDF } from 'survey-pdf';

function mountSurveyPreview() {
  return mount(SurveyPreview, {
    global: {
      plugins: [PrimeVue],
      stubs: {
        LanguageSelector: true,
        LevanteSpinner: {
          name: 'LevanteSpinner',
          template: '<div data-testid="levante-spinner">loading</div>',
        },
      },
    },
  });
}

describe('SurveyPreview', () => {
  beforeEach(() => {
    h.mockRoute.params = { id: '', locale: 'en' };
    delete h.mockRoute.params.live;
    h.surveyData.value = null;
    h.surveyError.value = null;
    h.isSurveyError.value = false;
    h.isSurveyLoading.value = false;
    h.mockPush.mockClear();
    h.surveyPdfSave.mockClear();
    SurveyPDF.mockClear();
  });

  it('shows LevanteSpinner while survey query is loading', async () => {
    h.mockRoute.params.id = 'parent_survey_child';
    h.isSurveyLoading.value = true;

    const wrapper = mountSurveyPreview();
    await nextTick();

    expect(wrapper.find('[data-testid="levante-spinner"]').exists()).toBe(true);
  });

  it('shows error message when survey query fails', async () => {
    h.mockRoute.params.id = 'parent_survey_child';
    h.isSurveyError.value = true;
    h.surveyError.value = new Error('Network down');

    const wrapper = mountSurveyPreview();
    await nextTick();

    expect(wrapper.text()).toContain('Network down');
  });

  it('shows empty state when no survey id is selected', async () => {
    h.mockRoute.params.id = '';
    h.isSurveyLoading.value = false;

    const wrapper = mountSurveyPreview();
    await nextTick();

    expect(wrapper.text()).toContain('Please select a survey to preview it');
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(false);
  });

  it('renders selected survey name and SurveyComponent when survey data loads', async () => {
    h.mockRoute.params.id = 'parent_survey_child';
    h.surveyData.value = { title: 'Test', pages: [] };
    h.isSurveyLoading.value = false;

    const wrapper = mountSurveyPreview();
    await nextTick();

    expect(wrapper.text()).toContain('Caregiver Child');
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(true);
  });

  it('uses live layout and hides aside when route live param is live', async () => {
    h.mockRoute.params = { id: 'parent_survey_child', locale: 'en', live: 'live' };
    h.surveyData.value = { title: 'Test', pages: [] };
    h.isSurveyLoading.value = false;

    const wrapper = mountSurveyPreview();
    await nextTick();

    expect(wrapper.find('.preview').classes()).toContain('preview--live');
    expect(wrapper.text()).not.toContain('Language');
  });

  it('live preview link includes survey id and locale', async () => {
    h.mockRoute.params.id = 'parent_survey_child';
    h.surveyData.value = { title: 'Test', pages: [] };
    h.isSurveyLoading.value = false;

    const wrapper = mountSurveyPreview();
    await nextTick();

    const anchor = wrapper.find('a[target="_blank"]');
    expect(anchor.attributes('href')).toBe('/survey/preview/parent_survey_child/live/en-US');
  });

  it('downloadPDF constructs SurveyPDF and calls save with survey id', async () => {
    h.mockRoute.params.id = 'parent_survey_child';
    h.surveyData.value = { title: 'Test', pages: [] };
    h.isSurveyLoading.value = false;

    const wrapper = mountSurveyPreview();
    await nextTick();

    const buttons = wrapper.findAll('button');
    const downloadBtn = buttons.find((b) => b.text().includes('Download as PDF'));
    expect(downloadBtn).toBeTruthy();
    await downloadBtn.trigger('click');
    await flushPromises();

    expect(SurveyPDF).toHaveBeenCalled();
    expect(h.surveyPdfSave.getCalls()).toEqual([['parent_survey_child']]);
  });
});
