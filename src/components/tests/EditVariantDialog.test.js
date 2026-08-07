import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvSelect from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import EditVariantDialog from '@/components/EditVariantDialog.vue';

// Force the non-LEVANTE path so onMounted does not inject a default userType
// condition, keeping assertions focused on the stored conditions under test.
vi.mock('@/constants', () => ({ isLevante: false }));

const createAssessment = (conditions) => ({
  id: 'test-variant-1',
  task: { id: 'test-task', name: 'Test Task', image: '/test-image.jpg' },
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

const openDialog = async (wrapper) => {
  await wrapper.find('[data-cy="button-edit-variant"]').trigger('click');
  await nextTick();
};

const selectLabels = (wrapper) => wrapper.findAll('.p-select-label').map((el) => el.text());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EditVariantDialog.vue - stored condition rendering (regression #1013)', () => {
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
    fieldSelect.vm.$emit('update:modelValue', 'age');
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
