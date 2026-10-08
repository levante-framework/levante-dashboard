import { mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvDatePicker from 'primevue/datepicker';
import PvToggleSwitch from 'primevue/toggleswitch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditUserForm, { type EditableUser } from './EditUserForm.vue';

// Stub the confirm/router composables so navigation and the confirm dialog are
// observable without a real router or ConfirmationService.
const { confirmRequireMock, routerPushMock } = vi.hoisted(() => ({
  confirmRequireMock: vi.fn(),
  routerPushMock: vi.fn(),
}));
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: confirmRequireMock }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPushMock }) }));

const globalMountOptions = {
  plugins: [PrimeVue],
  stubs: { RouterLink: RouterLinkStub, PvConfirmDialog: true },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Mount helper ─────────────────────────────────────────────────────────────

const DEFAULT_USER: EditableUser = {
  uid: 'user-1',
  archived: false,
  disabled: false,
  email: 'child@levante.com',
  userType: 'child',
};

const mountForm = (user: Partial<EditableUser> = {}) =>
  mount(EditUserForm, {
    props: { user: { ...DEFAULT_USER, ...user } },
    global: globalMountOptions,
  });

const setToggle = async (wrapper: ReturnType<typeof mountForm>, index: number, value: boolean) => {
  const toggle = wrapper.findAllComponents(PvToggleSwitch)[index];
  if (!toggle) throw new Error(`No toggle at index ${index}`);
  toggle.vm.$emit('update:modelValue', value);
  await wrapper.vm.$nextTick();
};

const setBirthDate = async (wrapper: ReturnType<typeof mountForm>, value: Date | null) => {
  wrapper.findComponent(PvDatePicker).vm.$emit('update:modelValue', value);
  await wrapper.vm.$nextTick();
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditUserForm', () => {
  describe('rendering', () => {
    it('shows the read-only user fields', () => {
      const wrapper = mountForm();
      expect(wrapper.text()).toContain('user-1');
      expect(wrapper.text()).toContain('child@levante.com');
      expect(wrapper.text()).toContain('child');
    });

    it('explains what the archived and disabled toggles do', () => {
      const wrapper = mountForm();
      const archived = wrapper.find('label[for="archived"]');
      const disabled = wrapper.find('label[for="disabled"]');
      expect(archived.text()).toContain('Exclude user from new assignments');
      expect(archived.text()).not.toContain('data release');
      expect(disabled.text()).toContain('Exclude user from new assignments and data release');
    });

    it('renders the child label when present', () => {
      const wrapper = mountForm({ childLabel: 'Child 3' });
      expect(wrapper.text()).toContain('Child Label');
      expect(wrapper.text()).toContain('Child 3');
    });

    it('omits the child label when absent', () => {
      const wrapper = mountForm();
      expect(wrapper.text()).not.toContain('Child Label');
    });

    it('seeds the toggles from the user values', () => {
      const wrapper = mountForm({ archived: true, disabled: false });
      const toggles = wrapper.findAllComponents(PvToggleSwitch);
      expect(toggles[0]?.props('modelValue')).toBe(true);
      expect(toggles[1]?.props('modelValue')).toBe(false);
    });

    it('renders read-only orgs with a capitalized org type', () => {
      const wrapper = mount(EditUserForm, {
        props: {
          user: DEFAULT_USER,
          orgs: [{ id: 'o1', name: 'Acme School', orgType: 'school' }],
        },
        global: globalMountOptions,
      });
      expect(wrapper.text()).toContain('Groups');
      expect(wrapper.text()).toContain('Acme School');
      expect(wrapper.text()).toContain('(School)');
    });

    it('renders read-only assignments with status and dates', () => {
      const wrapper = mount(EditUserForm, {
        props: {
          user: DEFAULT_USER,
          assignments: [
            { id: 'a1', name: 'Fall Screening', status: 'open', dateOpened: '2026-01-01', dateClosed: '2026-02-01' },
          ],
        },
        global: globalMountOptions,
      });
      expect(wrapper.text()).toContain('Assignments');
      expect(wrapper.text()).toContain('Fall Screening');
      expect(wrapper.text()).toContain('Open');

      const link = wrapper.findComponent(RouterLinkStub);
      expect(link.props('to')).toEqual({ name: 'AdministrationProgressReport', params: { administrationId: 'a1' } });
    });

    it('shows "None" for empty orgs and assignments and "Loading…" while loading', () => {
      expect(mountForm().text()).toContain('None');

      const loading = mount(EditUserForm, {
        props: { user: DEFAULT_USER, isLoading: true },
        global: globalMountOptions,
      });
      expect(loading.text()).toContain('Loading…');
    });

    it('distinguishes a load failure from an empty result', () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, isError: true },
        global: globalMountOptions,
      });
      expect(wrapper.text()).toContain('Failed to load groups.');
      expect(wrapper.text()).toContain('Failed to load assignments.');
      expect(wrapper.text()).not.toContain('None');
    });
  });

  describe('assignment navigation guard', () => {
    const ASSIGNMENT = {
      id: 'a1',
      name: 'Fall Screening',
      status: 'open',
      dateOpened: '2026-01-01',
      dateClosed: '2026-02-01',
    } as const;
    const ROUTE = { name: 'AdministrationProgressReport', params: { administrationId: 'a1' } };

    const mountWithAssignment = () =>
      mount(EditUserForm, {
        props: { user: DEFAULT_USER, assignments: [ASSIGNMENT] },
        global: globalMountOptions,
      });

    it('navigates directly when the form is not dirty', async () => {
      const wrapper = mountWithAssignment();

      await wrapper.get('a').trigger('click');

      expect(routerPushMock).toHaveBeenCalledWith(ROUTE);
      expect(confirmRequireMock).not.toHaveBeenCalled();
    });

    it('confirms before navigating when the form is dirty, discarding on accept', async () => {
      const wrapper = mountWithAssignment();
      await setToggle(wrapper, 0, true);

      await wrapper.get('a').trigger('click');

      expect(confirmRequireMock).toHaveBeenCalledTimes(1);
      expect(routerPushMock).not.toHaveBeenCalled();

      // Invoking the confirm's accept callback performs the deferred navigation.
      confirmRequireMock.mock.calls[0]?.[0]?.accept?.();
      expect(routerPushMock).toHaveBeenCalledWith(ROUTE);
    });
  });

  describe('dirty state', () => {
    it('emits dirty: false on mount', () => {
      const wrapper = mountForm();
      expect(wrapper.emitted('dirty')?.[0]).toEqual([false]);
    });

    it('emits dirty: true once a toggle diverges from the original', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([true]);
    });

    it('returns to dirty: false when toggled back to the original value', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      await setToggle(wrapper, 0, false);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([false]);
    });
  });

  describe('change events', () => {
    it('does not emit change on mount', () => {
      const wrapper = mountForm();
      expect(wrapper.emitted('change')).toBeUndefined();
    });

    it('emits only the changed field when a toggle changes', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 1, true);
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', disabled: true }]);
    });

    it('keeps the parent in sync by emitting on every toggle, dropping fields back at the original', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      await setToggle(wrapper, 0, false);
      expect(wrapper.emitted('change')).toHaveLength(2);
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1' }]);
    });
  });

  describe('birth date', () => {
    it('seeds the picker from birthMonth/birthYear (1-indexed month)', () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      const value = wrapper.findComponent(PvDatePicker).props('modelValue') as Date;
      expect(value.getFullYear()).toBe(2018);
      expect(value.getMonth()).toBe(5);
    });

    it('leaves the picker empty when birth data is absent', () => {
      const wrapper = mountForm();
      expect(wrapper.findComponent(PvDatePicker).props('modelValue')).toBeNull();
    });

    it('emits birthMonth/birthYear in the change payload when the picker changes', async () => {
      const wrapper = mountForm();
      await setBirthDate(wrapper, new Date(2019, 2, 1));
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', birthMonth: 3, birthYear: 2019 }]);
    });

    it('marks the form dirty when the birth date diverges from the original', async () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([false]);
      await setBirthDate(wrapper, new Date(2019, 5, 1));
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([true]);
    });

    it('shows a warning only while the birth date is dirty', async () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      const warning = () => wrapper.find('[data-testid="birth-date-warning"]');
      expect(warning().exists()).toBe(false);

      await setBirthDate(wrapper, new Date(2019, 5, 1));
      expect(warning().exists()).toBe(true);
      expect(warning().text().trim()).not.toBe('');

      await setBirthDate(wrapper, new Date(2018, 5, 1));
      expect(warning().exists()).toBe(false);
    });

    it('keeps the birth-date warning hidden when only another field is dirty', async () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      await setToggle(wrapper, 0, true);
      expect(wrapper.find('[data-testid="birth-date-warning"]').exists()).toBe(false);
    });

    it('reseeds the picker when birth data arrives from the overview', async () => {
      const wrapper = mountForm();
      expect(wrapper.findComponent(PvDatePicker).props('modelValue')).toBeNull();
      await wrapper.setProps({ birthMonth: 9, birthYear: 2016 });
      const value = wrapper.findComponent(PvDatePicker).props('modelValue') as Date;
      expect(value.getFullYear()).toBe(2016);
      expect(value.getMonth()).toBe(8);
    });

    it('emits only birthYear when the month is unchanged', async () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      await setBirthDate(wrapper, new Date(2020, 5, 1)); // same month (June), new year
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', birthYear: 2020 }]);
    });

    it('emits only birthMonth when the year is unchanged', async () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      await setBirthDate(wrapper, new Date(2018, 8, 1)); // same year, new month (September)
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', birthMonth: 9 }]);
    });

    it('keeps the user edit when birth data arrives from the overview afterwards', async () => {
      const wrapper = mountForm();
      await setBirthDate(wrapper, new Date(2019, 2, 1));
      await wrapper.setProps({ birthMonth: 9, birthYear: 2016 });
      const value = wrapper.findComponent(PvDatePicker).props('modelValue') as Date;
      expect(value.getFullYear()).toBe(2019);
      expect(value.getMonth()).toBe(2);
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', birthMonth: 3, birthYear: 2019 }]);
    });
  });

  describe('user prop changes', () => {
    it('reseeds the toggles and clears dirty when a different user loads', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([true]);

      await wrapper.setProps({ user: { ...DEFAULT_USER, uid: 'user-2', archived: false } });

      expect(wrapper.findAllComponents(PvToggleSwitch)[0]?.props('modelValue')).toBe(false);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([false]);
    });

    it('reseeds the birth picker and drops the touched edit when a different user loads', async () => {
      const wrapper = mount(EditUserForm, {
        props: { user: DEFAULT_USER, birthMonth: 6, birthYear: 2018 },
        global: globalMountOptions,
      });
      await setBirthDate(wrapper, new Date(2019, 2, 1));
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([true]);

      await wrapper.setProps({ user: { ...DEFAULT_USER, uid: 'user-2' }, birthMonth: 9, birthYear: 2016 });

      const value = wrapper.findComponent(PvDatePicker).props('modelValue') as Date;
      expect(value.getFullYear()).toBe(2016);
      expect(value.getMonth()).toBe(8);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([false]);
    });
  });
});
