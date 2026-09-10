import { mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvToggleSwitch from 'primevue/toggleswitch';
import { describe, expect, it } from 'vitest';
import EditUserForm, { type EditableUser } from './EditUserForm.vue';

const globalMountOptions = {
  plugins: [PrimeVue],
  stubs: { RouterLink: RouterLinkStub },
};

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditUserForm', () => {
  describe('rendering', () => {
    it('shows the read-only user fields', () => {
      const wrapper = mountForm();
      expect(wrapper.text()).toContain('user-1');
      expect(wrapper.text()).toContain('child@levante.com');
      expect(wrapper.text()).toContain('child');
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

    it('emits the edited payload when a toggle changes', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 1, true);
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', archived: false, disabled: true }]);
    });

    it('keeps the parent in sync by emitting on every toggle, including back to the original', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      await setToggle(wrapper, 0, false);
      expect(wrapper.emitted('change')).toHaveLength(2);
      expect(wrapper.emitted('change')?.at(-1)).toEqual([{ uid: 'user-1', archived: false, disabled: false }]);
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
  });
});
