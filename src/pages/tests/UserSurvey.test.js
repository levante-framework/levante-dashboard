import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import UserSurvey from '@/pages/UserSurvey.vue';
import { useSurveyStore } from '@/store/survey';

const { mockRouterPush } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock('@/store/survey', () => ({
  useSurveyStore: vi.fn(),
}));

vi.mock('@/components/LevanteSpinner.vue', () => ({
  default: {
    name: 'LevanteSpinner',
    props: ['fullscreen'],
    template: '<div data-testid="levante-spinner" :data-fullscreen="fullscreen" />',
  },
}));

vi.mock('survey-vue3-ui', () => ({
  SurveyComponent: {
    name: 'SurveyComponent',
    props: ['model'],
    template: '<div data-testid="survey-component" />',
  },
}));

vi.mock('survey-core/survey-core.css', () => ({}));

function createSurveyStoreMock(overrides = {}) {
  return {
    survey: ref({ id: 'survey-1' }),
    isSavingSurveyResponses: ref(false),
    ...overrides,
  };
}

function mountUserSurvey() {
  return mount(UserSurvey);
}

describe('UserSurvey.vue', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    vi.mocked(useSurveyStore).mockReset();
    vi.mocked(useSurveyStore).mockReturnValue(createSurveyStoreMock());
  });

  it('redirects to Home when there is no survey on mount', async () => {
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        survey: ref(null),
      }),
    );

    mountUserSurvey();
    await nextTick();

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'Home' });
  });

  it('does not redirect when a survey exists', async () => {
    mountUserSurvey();
    await nextTick();

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows the spinner when there is no survey', () => {
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        survey: ref(null),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('[data-testid="levante-spinner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(false);
  });

  it('shows the spinner while saving survey responses', () => {
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isSavingSurveyResponses: ref(true),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('[data-testid="levante-spinner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(false);
  });

  it('renders the survey when a survey exists and responses are not saving', () => {
    const surveyModel = { id: 'survey-1' };
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        survey: ref(surveyModel),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="levante-spinner"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'SurveyComponent' }).props('model')).toEqual(surveyModel);
  });
});
