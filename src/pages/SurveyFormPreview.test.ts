import { createTestingPinia } from '@pinia/testing';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyFormPreview from '@/pages/SurveyFormPreview.vue';
import { useAuthStore } from '@/store/auth';

const { loadFormDefinitions, saveOrgInformation } = vi.hoisted(() => ({
  loadFormDefinitions: vi.fn(),
  saveOrgInformation: vi.fn(),
}));

const route = {
  params: { formType: 'site' as string },
  query: {} as Record<string, string>,
};

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/firebase/repositories/SurveyFormsRepository', () => ({
  surveyFormsRepository: {
    loadFormDefinitions,
    saveOrgInformation,
  },
}));

vi.mock('@/components/LevanteSpinner.vue', () => ({
  default: {
    name: 'LevanteSpinner',
    props: ['fullscreen'],
    template: '<div class="levante-spinner">Loading...</div>',
  },
}));

const DEFINITION = {
  formId: 'siteInformation',
  versionId: 'v1',
  versionNumber: 1,
  formDescription: '',
  fieldsDescription: {},
  generalPrompt: 'Please complete.',
  sectionInfo: [],
  fullFields: [],
  orgType: 'site' as const,
  orgId: 'site-a',
  savedResponses: [],
};

let formMountCount = 0;

const FormRendererStub = {
  name: 'FormRenderer',
  props: ['fields', 'generalPrompt', 'sectionInfo', 'isSaving', 'isComplete', 'saveDraft'],
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

function mountPage(site: { id: string | null; name: string | null } = { id: 'site-a', name: 'Alpha Site' }) {
  const pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  const authStore = useAuthStore(pinia);
  authStore.currentSite = site.id;
  authStore.currentSiteName = site.name;

  const wrapper = mount(SurveyFormPreview, {
    global: {
      plugins: [
        pinia,
        PrimeVue,
        [VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }],
      ],
      directives: { tooltip: Tooltip },
      stubs: { FormRenderer: FormRendererStub },
    },
  });

  return { wrapper, authStore };
}

async function saveForm(wrapper: VueWrapper) {
  await wrapper.get('.save').trigger('click');
  await flushPromises();
}

describe('SurveyFormPreview', () => {
  beforeEach(() => {
    formMountCount = 0;
    route.params.formType = 'site';
    route.query = {};
    loadFormDefinitions.mockReset();
    saveOrgInformation.mockReset();
    loadFormDefinitions.mockImplementation(async (orgType: 'site' | 'school', orgId: string) => ({
      ...DEFINITION,
      orgType,
      orgId,
    }));
    saveOrgInformation.mockResolvedValue({});
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
    expect(wrapper.find('.p-message-info').exists()).toBe(true);
    expect(wrapper.find('.form-renderer-stub').exists()).toBe(false);
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
    expect(wrapper.find('.form-renderer-stub').exists()).toBe(true);
    expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-a');
  });

  it('loads the navbar site and titles the page with its name', async () => {
    const { wrapper } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();

    expect(wrapper.text()).toContain('Site Information: Alpha Site');
    expect(wrapper.find('.form-renderer-stub').exists()).toBe(true);
    expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-a');
  });

  it('ignores ?orgId= on the site form', async () => {
    route.query = { orgId: 'from-url' };
    const { wrapper } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();

    expect(wrapper.find('.form-renderer-stub').exists()).toBe(true);
    expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-a');
    expect(loadFormDefinitions).not.toHaveBeenCalledWith('site', 'from-url');
  });

  it('saves to the navbar site without ?orgId=', async () => {
    const { wrapper } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();
    await saveForm(wrapper);

    expect(saveOrgInformation).toHaveBeenCalledWith(
      expect.objectContaining({
        orgType: 'site',
        orgId: 'site-a',
      }),
    );
  });

  it('remounts an empty form and saves to the new site after a navbar change', async () => {
    const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();
    expect(formMountCount).toBe(1);

    authStore.currentSite = 'site-b';
    authStore.currentSiteName = 'Beta Site';
    await flushPromises();

    expect(wrapper.text()).toContain('Site Information: Beta Site');
    expect(formMountCount).toBe(2);
    expect(loadFormDefinitions).toHaveBeenCalledWith('site', 'site-b');

    await saveForm(wrapper);
    expect(saveOrgInformation.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        orgType: 'site',
        orgId: 'site-b',
      }),
    );
  });

  it('shows Select a site and unloads the form when the navbar goes back to All Sites', async () => {
    const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();
    expect(wrapper.find('.form-renderer-stub').exists()).toBe(true);
    loadFormDefinitions.mockClear();

    authStore.currentSite = 'any';
    authStore.currentSiteName = 'All Sites';
    await flushPromises();

    expect(wrapper.get('.survey-preview__title').text()).toBe('Site Information');
    expect(wrapper.text()).toContain('Select a site');
    expect(wrapper.find('.p-message-info').exists()).toBe(true);
    expect(wrapper.find('.form-renderer-stub').exists()).toBe(false);
    expect(loadFormDefinitions).not.toHaveBeenCalled();
  });

  it('does not mark the new site complete if submit finishes after a navbar change', async () => {
    let finishSave: (value: unknown) => void = () => {};
    saveOrgInformation.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );

    const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();

    await wrapper.get('.submit').trigger('click');
    authStore.currentSite = 'site-b';
    authStore.currentSiteName = 'Beta Site';
    await flushPromises();

    expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isSaving')).toBe(false);

    finishSave({});
    await flushPromises();

    expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isComplete')).toBe(false);
    expect(saveOrgInformation).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'site-a' }));
  });

  it('shows the form again after submit if the navbar site changes', async () => {
    const { wrapper, authStore } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();

    await wrapper.get('.submit').trigger('click');
    await flushPromises();
    expect(wrapper.find('.form-renderer-stub').exists()).toBe(true);
    expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isComplete')).toBe(true);

    authStore.currentSite = 'site-b';
    authStore.currentSiteName = 'Beta Site';
    await flushPromises();

    expect(wrapper.getComponent({ name: 'FormRenderer' }).props('isComplete')).toBe(false);
  });

  it('loads a school form from ?orgId= and ignores the navbar site', async () => {
    route.params.formType = 'school';
    route.query = { orgId: 'school-99' };
    const { wrapper } = mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();

    expect(wrapper.text()).toContain('Additional School Information');
    expect(loadFormDefinitions).toHaveBeenCalledWith('school', 'school-99');
    expect(loadFormDefinitions).not.toHaveBeenCalledWith('site', 'site-a');
  });

  it('falls back to preview for a school form without ?orgId=', async () => {
    route.params.formType = 'school';
    mountPage({ id: 'site-a', name: 'Alpha Site' });
    await flushPromises();

    expect(loadFormDefinitions).toHaveBeenCalledWith('school', 'preview');
  });
});
