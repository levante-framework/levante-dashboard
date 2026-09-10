import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvToggleSwitch from 'primevue/toggleswitch';
import { describe, expect, it } from 'vitest';
import EditUserForm, { type EditableUser } from './EditUserForm.vue';

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
    global: {
      plugins: [PrimeVue],
    },
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

    it('does not emit change when toggled back to the original value', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      await setToggle(wrapper, 0, false);
      expect(wrapper.emitted('change')).toHaveLength(1);
    });
  });

  describe('user prop changes', () => {
    it('reseeds the toggles and clears dirty when a different user loads', async () => {
      const wrapper = mountForm();
      await setToggle(wrapper, 0, true);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([true]);

      await wrapper.setProps({ user: { ...DEFAULT_USER, uid: 'user-2', archived: true } });

      const archivedToggle = wrapper.findAllComponents(PvToggleSwitch)[0];
      expect(archivedToggle?.props('modelValue')).toBe(true);
      expect(wrapper.emitted('dirty')?.at(-1)).toEqual([false]);
    });
  });
});
