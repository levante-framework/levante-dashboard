import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useSurveyFormDefinitionQuery } from '@/composables/queries/useSurveyFormDefinitionQuery';
import type { InformationFormField } from '@/firebase/repositories/SurveyFormsRepository';
import { useAuthStore } from '@/store/auth';
import OrgInformationView from './OrgInformationView.vue';

const mocks = vi.hoisted(() => ({
  route: {
    params: { formType: 'site' as string },
    query: { orgId: 'school-1' as string },
  },
}));

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue');
  mocks.route = reactive({
    params: { formType: 'site' },
    query: { orgId: 'school-1' },
  });
  return {
    useRoute: () => mocks.route,
    useRouter: () => ({ push: vi.fn() }),
  };
});

vi.mock('@/composables/queries/useSurveyFormDefinitionQuery', () => ({
  useSurveyFormDefinitionQuery: vi.fn(),
}));

const FIELDS: InformationFormField[] = [
  {
    itemId: 'site_01',
    variableName: 'sampleApproach',
    kind: 'single-select',
    required: true,
    sectionId: 'recruitment',
    questionText: 'Sampling approach',
    options: [
      { value: 'convenience', label: 'Convenience' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    itemId: 'site_01a',
    variableName: 'sampleApproachOther',
    kind: 'text',
    required: true,
    sectionId: 'recruitment',
    questionText: 'If you selected "Other," please explain',
    displayLogic: { field: 'sampleApproach', includes: 'other' },
  },
  {
    itemId: 'site_02',
    variableName: 'locations',
    kind: 'multi-select',
    required: true,
    sectionId: 'recruitment',
    questionText: 'Where was data collected?',
    options: [
      { value: 'school', label: 'School' },
      { value: 'home', label: 'Home' },
    ],
  },
  {
    itemId: 'site_03',
    variableName: 'notes',
    kind: 'text',
    required: false,
    sectionId: 'recruitment',
    questionText: 'Notes',
  },
  {
    itemId: 'site_04',
    variableName: 'languages',
    kind: 'language-selection',
    required: true,
    sectionId: 'recruitment',
    questionText: 'Spoken languages',
  },
  {
    itemId: 'site_05',
    variableName: 'recruitment',
    kind: 'text',
    required: false,
    sectionId: 'recruitment',
    questionText: '<p>How were they recruited?</p><ul><li>Phone</li></ul>',
  },
];

function mockQuery(responses: Record<string, unknown>) {
  vi.mocked(useSurveyFormDefinitionQuery).mockReturnValue({
    data: ref({
      formId: 'siteInformation',
      versionId: 'v1',
      versionNumber: 1,
      formDescription: '',
      fieldsDescription: {},
      generalPrompt: '',
      sectionInfo: [],
      fullFields: FIELDS,
      orgType: 'site',
      orgId: 'district-1',
      savedResponses: [{ formVersion: 'v1', status: 'complete', responses }],
    }),
    isLoading: ref(false),
    isError: ref(false),
    error: ref(null),
  } as unknown as ReturnType<typeof useSurveyFormDefinitionQuery>);
}

function mountPage() {
  const pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  const authStore = useAuthStore(pinia);
  authStore.currentSite = 'district-1';
  authStore.currentSiteName = 'North';
  return mount(OrgInformationView, {
    global: { plugins: [pinia, PrimeVue] },
  });
}

function answerFor(wrapper: VueWrapper, question: string): string {
  const field = wrapper.findAll('.org-information-view__field').find((node) => node.text().includes(question));
  if (!field) throw new Error(`Field "${question}" was not found`);
  return field.get('.org-information-view__answer').text();
}

describe('OrgInformationView', () => {
  beforeEach(() => {
    mocks.route.params.formType = 'site';
  });

  it('shows question text and readable answers, and opens a Freshdesk ticket', async () => {
    mockQuery({
      sampleApproach: 'convenience',
      locations: ['school', 'home'],
      notes: '',
      languages: { codes: ['en', 'other'], otherDescription: 'Klingon' },
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(answerFor(wrapper, 'Sampling approach')).toBe('Convenience');
    expect(answerFor(wrapper, 'Where was data collected?')).toBe('School, Home');
    expect(answerFor(wrapper, 'Notes')).toBe('');
    expect(answerFor(wrapper, 'Spoken languages')).toBe('English, Other (Describe), Klingon');
    const recruitment = wrapper
      .findAll('.org-information-view__question')
      .find((node) => node.text().includes('Phone'));
    expect(recruitment?.find('ul').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('convenience');
    expect(wrapper.text()).not.toContain('please explain');
    expect(wrapper.text()).not.toContain('Next');
    expect(wrapper.text()).not.toContain('Submit');

    const ticket = wrapper.get('a');
    expect(ticket.text()).toBe('Open a Ticket');
    expect(ticket.attributes('href')).toBe('https://levante-support.freshdesk.com/support/tickets/new');
    expect(ticket.attributes('target')).toBe('_blank');
  });

  it('shows the Other explanation when Other was selected', async () => {
    mockQuery({
      sampleApproach: ['residence', 'other'],
      sampleApproachOther: 'word of mouth',
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(answerFor(wrapper, 'please explain')).toBe('word of mouth');
  });
});
