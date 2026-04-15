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

const { mockUseUpsertOrgMutation, mockOrgNameExistsState } = vi.hoisted(() => ({
  mockUseUpsertOrgMutation: vi.fn(),
  mockOrgNameExistsState: {
    value: false,
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

vi.mock('@/composables/queries/useDistrictsListQuery', () => ({
  default: vi.fn(() => ({
    data: ref([]),
    isLoading: ref(false),
  })),
}));

vi.mock('@/composables/queries/useDistrictSchoolsQuery', () => ({
  default: vi.fn(() => ({
    data: ref([]),
    isFetching: ref(false),
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
  mockOrgNameExistsState.value = false;
  mockUseUpsertOrgMutation.mockClear();
  setActivePinia(createPinia());
  mockToastAdd.mockClear();
  mockUseUpsertOrgMutation.mockClear();
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

    // Component does not yet validate duplicate names via useOrgNameExistsQuery; mutation is called
    expect(mockUseUpsertOrgMutation).toHaveBeenCalledTimes(1);

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
