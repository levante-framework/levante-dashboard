import AddGroupModal from '@/components/modals/AddGroupModal.vue';
import * as VueQuery from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PvAutoComplete from 'primevue/autocomplete';
import PvButton from 'primevue/button';
import PrimeVue from 'primevue/config';
import PvDialog from 'primevue/dialog';
import PvFloatLabel from 'primevue/floatlabel';
import PvInputText from 'primevue/inputtext';
import PvSelect from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

const { mockUseUpsertOrgMutation, mockExistingOrgs } = vi.hoisted(() => ({
  mockUseUpsertOrgMutation: vi.fn(),
  mockExistingOrgs: {
    value: [],
  },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    getUserId: vi.fn(() => 'test-user-id'),
    $subscribe: vi.fn(),
    isUserSuperAdmin: vi.fn(() => true),
    roarfirekit: ref({
      restConfig: true,
    }),
    isAuthenticated: () => true,
    firebaseUser: ref({
      adminFirebaseUser: {
        uid: 'test-user-id',
        email: 'test@example.com',
      },
    }),
    userData: ref({
      roles: [],
    }),
    shouldUsePermissions: ref(false),
    currentSite: '12345', // Site id
    userClaims: ref({
      claims: {
        adminOrgs: {
          districts: [],
          schools: [],
          classes: [],
          groups: [],
          families: [],
        },
      },
    }),
    sites: [],
    currentSiteName: 'Test Site',
  })),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    userRole: ref('super_admin'),
    hasMinimumRole: vi.fn(() => true),
  }),
}));

vi.mock('@/composables/mutations/useUpsertOrgMutation', () => ({
  default: vi.fn(() => ({
    mutate: mockUseUpsertOrgMutation,
    isPending: ref(false),
    error: null,
  })),
}));

vi.mock('@/composables/queries/_useSchoolsQuery', () => ({
  default: vi.fn(() => ({
    data: ref([]),
    isFetching: ref(false),
  })),
}));

vi.mock('@/composables/queries/useOrgsTableQuery', () => ({
  default: vi.fn(() => ({
    data: mockExistingOrgs,
    isLoading: ref(false),
    isFetching: ref(false),
    isError: ref(false),
    error: ref(null),
  })),
}));

const mockToastAdd = vi.fn();

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

const mountOptions = {
  attachTo: document.body,
  global: {
    components: {
      PvDialog,
      PvFloatLabel,
      PvSelect,
      PvInputText,
      PvButton,
      PvAutoComplete,
    },
    plugins: [PrimeVue, VueQuery.VueQueryPlugin],
  },
  props: {
    isVisible: true,
  },
};

beforeEach(() => {
  mockExistingOrgs.value = [];
  mockUseUpsertOrgMutation.mockClear();
  setActivePinia(createPinia());
  mockToastAdd.mockClear();
});

describe('AddGroupModal.vue', () => {
  it('should render the component (when visible)', async () => {
    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    expect(wrapper.exists()).toBe(true);

    const modalTitle = document.querySelector('[data-testid="modalTitle"]');
    expect(modalTitle).not.toBeNull();
    expect(modalTitle.textContent).toContain('Create Site');

    wrapper.unmount();
  });

  it('should NOT render the component (when NOT visible)', async () => {
    const wrapper = mount(AddGroupModal, {
      ...mountOptions,
      props: {
        isVisible: false,
      },
    });
    await nextTick();

    expect(wrapper.exists()).toBe(true);

    const modalTitle = document.querySelector('[data-testid="modalTitle"]');
    expect(modalTitle).toBeNull();

    wrapper.unmount();
  });

  it('should show an error if a required field is not filled in', async () => {
    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    const submitBtn = document.querySelector('[data-testid="submitBtn"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toContain('Create Site');

    await submitBtn.click();

    const errorMessages = document.querySelectorAll('.p-error');
    expect(errorMessages.length).toBe(1);

    wrapper.unmount();
  });

  it('should NOT allow users to create 2 or more groups with the same name', async () => {
    // Seed the existing-orgs list returned by useOrgsTableQuery with a duplicate (case/whitespace
    // insensitive via normalizeToLowercase) so the `unique` validator should fail.
    mockExistingOrgs.value = [{ id: 'existing-1', name: 'Test Site' }];

    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    // Programmatically select the Site org type (more stable than simulating PrimeVue dropdown in tests)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapper.vm.orgType = { firestoreCollection: 'districts', singular: 'district', label: 'Site' };
    await nextTick();
    await flushPromises();

    const orgName = document.querySelector('[data-cy="input-org-name"]');
    expect(orgName).not.toBeNull();
    orgName.value = 'test site'; // Different casing/whitespace on purpose
    orgName.dispatchEvent(new Event('input'));
    await nextTick();

    // Do NOT bypass vuelidate here; we want the real `unique` validator to run.
    const submitBtn = document.querySelector('[data-testid="submitBtn"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toContain('Create Site');

    await submitBtn.click();
    await flushPromises();

    // Mutation must NOT fire when the unique rule fails.
    expect(mockUseUpsertOrgMutation).not.toHaveBeenCalled();

    // The dynamic withMessage() callback should render the orgTypeLabel-aware error.
    const errorTexts = Array.from(document.querySelectorAll('.p-error')).map((el) =>
      el.textContent.trim(),
    );
    expect(errorTexts).toContain('A site with this name already exists.');

    wrapper.unmount();
  });

  it('should render the unique error message reflecting the current orgType label', async () => {
    mockExistingOrgs.value = [{ id: 'existing-1', name: 'Grade 3' }];

    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    // Switch to "Cohort" (groups) so the dynamic message uses that label instead of "site".
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapper.vm.orgType = { firestoreCollection: 'groups', singular: 'group', label: 'Cohort' };
    await nextTick();
    await flushPromises();

    const orgName = document.querySelector('[data-cy="input-org-name"]');
    orgName.value = 'Grade 3';
    orgName.dispatchEvent(new Event('input'));
    await nextTick();

    const submitBtn = document.querySelector('[data-testid="submitBtn"]');
    await submitBtn.click();
    await flushPromises();

    expect(mockUseUpsertOrgMutation).not.toHaveBeenCalled();

    const errorTexts = Array.from(document.querySelectorAll('.p-error')).map((el) =>
      el.textContent.trim(),
    );
    expect(errorTexts).toContain('A cohort with this name already exists.');

    wrapper.unmount();
  });

  it('should submit the form if everything is ok', async () => {
    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    // Programmatically select the Site org type (more stable than simulating PrimeVue dropdown in tests)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapper.vm.orgType = { firestoreCollection: 'districts', singular: 'district', label: 'Site' };
    await nextTick();
    await flushPromises();

    // Now we provide a site name
    const orgName = document.querySelector('[data-cy="input-org-name"]');
    expect(orgName).not.toBeNull();
    orgName.value = 'Test Site';
    orgName.dispatchEvent(new Event('input'));
    await nextTick();

    // Mocking the vuelidate
    wrapper.vm.v$.$validate = () => Promise.resolve(true);

    // After that, we select the submit button and check if it says "Create Site"
    const submitBtn = document.querySelector('[data-testid="submitBtn"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toContain('Create Site');

    await submitBtn.click();
    await flushPromises();

    const errorMessages = document.querySelectorAll('.p-error');
    expect(errorMessages.length).toBe(0);

    expect(mockUseUpsertOrgMutation).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('should set submit btn as disabled after clicking it', async () => {
    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    // Programmatically select the Site org type (more stable than simulating PrimeVue dropdown in tests)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapper.vm.orgType = { firestoreCollection: 'districts', singular: 'district', label: 'Site' };
    await nextTick();
    await flushPromises();

    // Now we provide a site name
    const orgName = document.querySelector('[data-cy="input-org-name"]');
    expect(orgName).not.toBeNull();
    orgName.value = 'Test Site';
    orgName.dispatchEvent(new Event('input'));
    await nextTick();

    // Mocking the vuelidate
    wrapper.vm.v$.$validate = () => Promise.resolve(true);

    // After that, we select the submit button and check if it says "Create Site"
    const submitBtn = document.querySelector('[data-testid="submitBtn"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toContain('Create Site');

    await submitBtn.click();
    expect(submitBtn.disabled).toBe(true);

    await flushPromises();

    const errorMessages = document.querySelectorAll('.p-error');
    // We should NOT have any errors
    expect(errorMessages.length).toBe(0);

    expect(mockUseUpsertOrgMutation).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('should display an error message when creating an org that already exists', async () => {
    const wrapper = mount(AddGroupModal, mountOptions);
    await nextTick();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    wrapper.vm.orgType = { firestoreCollection: 'districts', singular: 'district', label: 'Site' };
    await nextTick();
    await flushPromises();

    const orgName = document.querySelector('[data-cy="input-org-name"]');
    expect(orgName).not.toBeNull();
    orgName.value = 'Existing Site';
    orgName.dispatchEvent(new Event('input'));
    await nextTick();

    wrapper.vm.v$.$validate = () => Promise.resolve(true);

    const submitBtn = document.querySelector('[data-testid="submitBtn"]');
    expect(submitBtn).not.toBeNull();
    await submitBtn.click();
    await flushPromises();

    expect(mockUseUpsertOrgMutation).toHaveBeenCalledTimes(1);
    const mutateCall = mockUseUpsertOrgMutation.mock.calls[0];
    const options = mutateCall[1];
    const alreadyExistsError = new Error('An organization with this name already exists');
    options.onError(alreadyExistsError);

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error',
        detail: 'An organization with this name already exists',
      }),
    );

    wrapper.unmount();
  });
});
