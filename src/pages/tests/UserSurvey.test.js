import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import UserSurvey from '@/pages/UserSurvey.vue';
import { useAuthStore } from '@/store/auth';
import { useSurveyStore } from '@/store/survey';

const { mockRouterPush } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
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

const TRANSLATIONS = {
  'userSurvey.specificRelationDescriptionChildA': 'For child with Birth Month',
  'userSurvey.specificRelationDescriptionChildB': 'and Birth Year',
  'userSurvey.specificRelationDescriptionClass': 'For class',
};

function createAuthStoreMock(overrides = {}) {
  return {
    userData: ref({ userType: 'parent' }),
    ...overrides,
  };
}

function createSurveyStoreMock(overrides = {}) {
  return {
    survey: ref({ id: 'survey-1' }),
    isSavingSurveyResponses: ref(false),
    isGeneralSurveyComplete: ref(false),
    isSurveyPartSubmitted: ref(false),
    specificSurveyRelationData: ref([]),
    specificSurveyRelationIndex: ref(0),
    ...overrides,
  };
}

function mountUserSurvey() {
  return mount(UserSurvey, {
    global: {
      mocks: {
        $t: (key) => TRANSLATIONS[key] ?? key,
      },
    },
  });
}

describe('UserSurvey.vue', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    vi.mocked(useAuthStore).mockReset();
    vi.mocked(useSurveyStore).mockReset();
    vi.mocked(useAuthStore).mockReturnValue(createAuthStoreMock());
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

  it('shows the parent-specific relation header when the general survey is complete', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'parent' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        specificSurveyRelationData: ref([{ birthMonth: 'March', birthYear: '2018', name: 'Alex' }]),
        specificSurveyRelationIndex: ref(0),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').text()).toBe('For child with Birth Month March and Birth Year 2018');
  });

  it('shows the class-specific relation header for non-parent users when the general survey is complete', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'teacher' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        specificSurveyRelationData: ref([{ birthMonth: 'March', birthYear: '2018', name: 'Room 12' }]),
        specificSurveyRelationIndex: ref(0),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').text()).toBe('For class Room 12');
  });

  it('uses the relation at the current specific survey index', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'parent' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        specificSurveyRelationData: ref([
          { birthMonth: 'January', birthYear: '2017', name: 'First' },
          { birthMonth: 'June', birthYear: '2019', name: 'Second' },
        ]),
        specificSurveyRelationIndex: ref(1),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').text()).toBe('For child with Birth Month June and Birth Year 2019');
  });

  it('falls back to placeholders when relation fields are missing', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'parent' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        specificSurveyRelationData: ref([{}]),
        specificSurveyRelationIndex: ref(0),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').text()).toBe('For child with Birth Month -- and Birth Year --');
  });

  it('falls back to a placeholder class name when the relation name is missing', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'teacher' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        specificSurveyRelationData: ref([{}]),
        specificSurveyRelationIndex: ref(0),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').text()).toBe('For class --');
  });

  it('hides the relation header for students', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'student' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        specificSurveyRelationData: ref([{ birthMonth: 'March', birthYear: '2018', name: 'Alex' }]),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(true);
  });

  it('hides the relation header once the survey is completed, so it does not overlap the thank-you page', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'parent' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(true),
        isSurveyPartSubmitted: ref(true),
        specificSurveyRelationData: ref([{ birthMonth: 'March', birthYear: '2018', name: 'Alex' }]),
        specificSurveyRelationIndex: ref(0),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(true);
  });

  it('hides the relation header when the general survey is incomplete', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      createAuthStoreMock({
        userData: ref({ userType: 'parent' }),
      }),
    );
    vi.mocked(useSurveyStore).mockReturnValue(
      createSurveyStoreMock({
        isGeneralSurveyComplete: ref(false),
        specificSurveyRelationData: ref([{ birthMonth: 'March', birthYear: '2018', name: 'Alex' }]),
      }),
    );

    const wrapper = mountUserSurvey();

    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.find('[data-testid="survey-component"]').exists()).toBe(true);
  });
});
