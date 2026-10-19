import { mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvSelect from 'primevue/select';
import PvToggleSwitch from 'primevue/toggleswitch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import EditVariantDialog from '@/components/assignments/EditVariantDialog.vue';

interface Condition {
  field: string;
  op: string;
  value: string;
}

interface ConditionsStructure {
  assigned?: { op: string; conditions: Condition[] };
  optional?: boolean | { op: string; conditions: Condition[] };
}

// isLevante is mutated per test. It defaults to false so onMounted does not inject
// a default userType condition, keeping most assertions focused on stored conditions.
const constantsMock = vi.hoisted(() => ({ isLevante: false }));
vi.mock('@/constants', () => constantsMock);

const createAssessment = (conditions: ConditionsStructure, taskId = 'test-task') => ({
  id: 'test-variant-1',
  task: { id: taskId, name: 'Test Task', image: '/test-image.jpg' },
  variant: { name: 'Test Variant', conditions },
});

const mountOptions = {
  global: {
    plugins: [PrimeVue],
    // Render teleported dialog content inline so it can be queried via the wrapper.
    stubs: { teleport: true },
    directives: {
      tooltip: { mounted() {}, updated() {} },
    },
  },
};

const openDialog = async (wrapper: VueWrapper) => {
  await wrapper.find('[data-cy="button-edit-variant"]').trigger('click');
  await nextTick();
};

const selectLabels = (wrapper: VueWrapper) => wrapper.findAll('.p-select-label').map((el) => el.text());

beforeEach(() => {
  vi.clearAllMocks();
  constantsMock.isLevante = false;
});

describe('stored condition rendering (regression #1013)', () => {
  it('renders string-based assigned conditions with their labels instead of placeholders', async () => {
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          assigned: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }] },
        }),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);

    const labels = selectLabels(wrapper);

    // The bug (#1013) showed placeholders here because the stored string values
    // could not be matched against the option objects.
    expect(labels).toContain('User Type');
    expect(labels).toContain('Equal');
    expect(labels).toContain('Child');

    expect(labels).not.toContain('Select a Field');
    expect(labels).not.toContain('Condition');
    expect(labels).not.toContain('Value');

    wrapper.unmount();
  });

  it('reads assigned conditions from the variant when re-opening after an edit', async () => {
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        // Conditions live on the variant (as written back by updateVariant),
        // not in preExistingAssessmentInfo.
        assessment: createAssessment({
          assigned: { op: 'AND', conditions: [{ field: 'age', op: 'GREATER_THAN', value: '5' }] },
        }),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);

    const labels = selectLabels(wrapper);
    expect(labels).toContain('Age');
    expect(labels).toContain('Greater Than');
    expect(labels).toContain('5');

    wrapper.unmount();
  });

  it('resets the operation and value selects when the field changes', async () => {
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          assigned: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }] },
        }),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);

    // For a single assigned condition the selects render as [field, op, value].
    const [fieldSelect] = wrapper.findAllComponents(PvSelect);
    fieldSelect?.vm.$emit('update:modelValue', 'age');
    await nextTick();

    const labels = selectLabels(wrapper);
    expect(labels).toContain('Age');
    // op and value fall back to their placeholders instead of the stale userType values.
    expect(labels).toContain('Condition');
    expect(labels).toContain('Value');
    expect(labels).not.toContain('Equal');
    expect(labels).not.toContain('Child');

    wrapper.unmount();
  });

  it('round-trips stored string conditions through save without object conversion', async () => {
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          assigned: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }] },
        }),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).toHaveBeenCalledWith('test-variant-1', {
      assigned: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }] },
    });

    wrapper.unmount();
  });

  it('blocks saving when duplicate userType conditions are present', async () => {
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          assigned: {
            op: 'AND',
            conditions: [
              { field: 'userType', op: 'EQUAL', value: 'student' },
              { field: 'userType', op: 'EQUAL', value: 'student' },
            ],
          },
        }),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Duplicate User Type conditions in Assigned Conditions');

    wrapper.unmount();
  });
});

describe('LEVANTE default userType condition', () => {
  it('injects a default child condition for non-survey tasks with no stored conditions', async () => {
    constantsMock.isLevante = true;
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({}),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);

    const labels = selectLabels(wrapper);
    expect(labels).toContain('User Type');
    expect(labels).toContain('Equal');
    expect(labels).toContain('Child');

    wrapper.unmount();
  });

  it('does not inject a default condition for survey tasks', async () => {
    constantsMock.isLevante = true;
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({}, 'intro-survey'),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);

    expect(selectLabels(wrapper)).not.toContain('Child');
    expect(wrapper.text()).toContain('No Conditions Added');

    wrapper.unmount();
  });

  it('does not duplicate the default when an identical condition is already stored', async () => {
    constantsMock.isLevante = true;
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          assigned: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }] },
        }),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).toHaveBeenCalledWith('test-variant-1', {
      assigned: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }] },
    });

    wrapper.unmount();
  });
});

describe('empty field validation', () => {
  it('blocks saving and reports when an assigned condition has empty fields', async () => {
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({}),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    // Add a blank assigned condition, then attempt to save without filling it in.
    await wrapper.find('[data-cy="button-assigned-condition"]').trigger('click');
    await nextTick();
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Missing fields in Assigned Conditions');

    wrapper.unmount();
  });

  it('blocks saving and reports when an optional condition has empty fields', async () => {
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({}),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    await wrapper.find('[data-cy="button-optional-condition"]').trigger('click');
    await nextTick();
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Missing fields in Optional Conditions');

    wrapper.unmount();
  });
});

describe('optional-for-all toggle', () => {
  it('saves optional as true and clears optional conditions when toggled on', async () => {
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          optional: { op: 'AND', conditions: [{ field: 'age', op: 'EQUAL', value: '5' }] },
        }),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    wrapper.findComponent(PvToggleSwitch).vm.$emit('update:modelValue', true);
    await nextTick();
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).toHaveBeenCalledWith('test-variant-1', { optional: true });

    wrapper.unmount();
  });

  it('restores the stored optional conditions when toggled on and back off', async () => {
    const updateVariant = vi.fn();
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({
          optional: { op: 'AND', conditions: [{ field: 'age', op: 'EQUAL', value: '5' }] },
        }),
        updateVariant,
        preExistingAssessmentInfo: [],
      },
    });

    await openDialog(wrapper);
    const toggle = wrapper.findComponent(PvToggleSwitch);
    toggle.vm.$emit('update:modelValue', true);
    await nextTick();
    toggle.vm.$emit('update:modelValue', false);
    await nextTick();
    await wrapper.find('[data-cy="button-save-conditions"]').trigger('click');
    await nextTick();

    expect(updateVariant).toHaveBeenCalledWith('test-variant-1', {
      optional: { op: 'AND', conditions: [{ field: 'age', op: 'EQUAL', value: '5' }] },
    });

    wrapper.unmount();
  });
});

describe('preExistingAssessmentInfo fallback', () => {
  it('reads assigned conditions from preExistingAssessmentInfo when the variant has none', async () => {
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({}),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [
          {
            taskId: 'test-task',
            conditions: { assigned: { op: 'AND', conditions: [{ field: 'age', op: 'GREATER_THAN', value: '7' }] } },
          },
        ],
      },
    });

    await openDialog(wrapper);

    const labels = selectLabels(wrapper);
    expect(labels).toContain('Age');
    expect(labels).toContain('Greater Than');
    expect(labels).toContain('7');

    wrapper.unmount();
  });

  it('reads optional conditions from preExistingAssessmentInfo when the variant has none', async () => {
    const wrapper = mount(EditVariantDialog, {
      ...mountOptions,
      props: {
        assessment: createAssessment({}),
        updateVariant: vi.fn(),
        preExistingAssessmentInfo: [
          {
            taskId: 'test-task',
            conditions: { optional: { op: 'AND', conditions: [{ field: 'userType', op: 'EQUAL', value: 'parent' }] } },
          },
        ],
      },
    });

    await openDialog(wrapper);

    const labels = selectLabels(wrapper);
    expect(labels).toContain('User Type');
    expect(labels).toContain('Equal');
    expect(labels).toContain('Caregiver');

    wrapper.unmount();
  });
});
