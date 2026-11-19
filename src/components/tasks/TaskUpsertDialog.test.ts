import { mount, type VueWrapper } from '@vue/test-utils';
import PvCheckbox from 'primevue/checkbox';
import PrimeVue from 'primevue/config';
import PvMultiSelect from 'primevue/multiselect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import TaskUpsertDialog from '@/components/tasks/TaskUpsertDialog.vue';
import type { SerializedTask } from '@/types/taskCatalog';

const { mutateAsync, toastAdd } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/mutations/useUpsertTaskMutation', () => ({
  default: () => ({ mutateAsync, isPending: ref(false) }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd }),
}));

// Render the dialog's slots inline so the form is queryable; the real PvDialog
// teleports its content to document.body, out of the wrapper tree.
vi.mock('primevue/dialog', () => ({
  default: {
    name: 'PvDialog',
    props: ['visible'],
    template: '<div v-if="visible"><slot name="header" /><slot /></div>',
  },
}));

const mountOptions = {
  global: {
    plugins: [PrimeVue],
  },
};

const createTask = (overrides: Partial<SerializedTask> = {}): SerializedTask => ({
  id: 'matrix-reasoning',
  archived: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  description: 'Existing description',
  image: 'https://example.com/task.png',
  name: 'Matrix Reasoning',
  registered: true,
  updatedAt: '2024-01-02T00:00:00.000Z',
  validUserTypes: ['child', 'teacher'],
  ...overrides,
});

const registeredCheckbox = (wrapper: VueWrapper) => wrapper.findAllComponents(PvCheckbox)[0];
const archivedCheckbox = (wrapper: VueWrapper) => wrapper.findAllComponents(PvCheckbox)[1];
const multiSelect = (wrapper: VueWrapper) => wrapper.findComponent(PvMultiSelect);
const errorText = (wrapper: VueWrapper) => wrapper.find('.p-error').exists() && wrapper.find('.p-error').text();

const fillRequiredFields = async (wrapper: VueWrapper) => {
  await wrapper.find('#task-name').setValue('Matrix Reasoning');
  await wrapper.find('#task-description').setValue('A reasoning task');
  await wrapper.find('#task-image').setValue('https://example.com/img.png');
};

const submit = async (wrapper: VueWrapper) => {
  await wrapper.find('form').trigger('submit.prevent');
  await nextTick();
};

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ task: createTask() });
});

describe('TaskUpsertDialog create flow', () => {
  it('sends the full payload with registered, archived and the selected validUserTypes, and no id', async () => {
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    await fillRequiredFields(wrapper);
    registeredCheckbox(wrapper).vm.$emit('update:modelValue', true);
    archivedCheckbox(wrapper).vm.$emit('update:modelValue', true);
    multiSelect(wrapper).vm.$emit('update:modelValue', ['child', 'teacher']);
    await nextTick();

    await submit(wrapper);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Matrix Reasoning',
      description: 'A reasoning task',
      image: 'https://example.com/img.png',
      archived: true,
      registered: true,
      validUserTypes: ['child', 'teacher'],
    });
    // No id on create — the backend derives it from the name.
    expect(mutateAsync.mock.calls[0][0]).not.toHaveProperty('id');

    wrapper.unmount();
  });

  it('defaults registered/archived to false and validUserTypes to an empty array', async () => {
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    await fillRequiredFields(wrapper);
    await submit(wrapper);

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ archived: false, registered: false, validUserTypes: [] }),
    );

    wrapper.unmount();
  });

  it('trims whitespace from name, description and image before submitting', async () => {
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    await wrapper.find('#task-name').setValue('  Matrix Reasoning  ');
    await wrapper.find('#task-description').setValue('  A reasoning task  ');
    await wrapper.find('#task-image').setValue('  https://example.com/img.png  ');
    await submit(wrapper);

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Matrix Reasoning',
        description: 'A reasoning task',
        image: 'https://example.com/img.png',
      }),
    );

    wrapper.unmount();
  });

  it('shows the Create label and create-mode header copy', () => {
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    expect(wrapper.find('button[type="submit"]').text()).toBe('Create');
    expect(wrapper.text()).toContain('Create task');

    wrapper.unmount();
  });
});

describe('TaskUpsertDialog validation', () => {
  it('blocks submit and shows an error when a required field is missing', async () => {
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    await wrapper.find('#task-name').setValue('Matrix Reasoning');
    // description and image left empty
    await submit(wrapper);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(errorText(wrapper)).toBe('Name, description, and image URL are required.');

    wrapper.unmount();
  });

  it('blocks submit when the name yields no derivable id on create', async () => {
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    // Symbols-only name trims to an empty semantic id.
    await wrapper.find('#task-name').setValue('***');
    await wrapper.find('#task-description').setValue('A reasoning task');
    await wrapper.find('#task-image').setValue('https://example.com/img.png');
    await submit(wrapper);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(errorText(wrapper)).toBe('Name must yield a non-empty id.');

    wrapper.unmount();
  });
});

describe('TaskUpsertDialog edit flow', () => {
  it('seeds every field from the task being edited', async () => {
    const wrapper = mount(TaskUpsertDialog, {
      ...mountOptions,
      props: {
        visible: true,
        task: createTask({ registered: true, archived: true, validUserTypes: ['caregiver'] }),
      },
    });
    await nextTick();

    expect(wrapper.find('button[type="submit"]').text()).toBe('Save');
    expect((wrapper.find('#task-name').element as HTMLInputElement).value).toBe('Matrix Reasoning');
    expect(registeredCheckbox(wrapper).props('modelValue')).toBe(true);
    expect(archivedCheckbox(wrapper).props('modelValue')).toBe(true);
    expect(multiSelect(wrapper).props('modelValue')).toEqual(['caregiver']);

    wrapper.unmount();
  });

  it('preserves the seeded fields and sends the id when saving an unchanged task', async () => {
    const wrapper = mount(TaskUpsertDialog, {
      ...mountOptions,
      props: { visible: true, task: createTask({ registered: false, validUserTypes: ['child', 'teacher'] }) },
    });
    await nextTick();

    await submit(wrapper);

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'matrix-reasoning',
        registered: false,
        validUserTypes: ['child', 'teacher'],
      }),
    );

    wrapper.unmount();
  });

  it('does not seed the form while the dialog is hidden', async () => {
    const wrapper = mount(TaskUpsertDialog, {
      ...mountOptions,
      props: { visible: false, task: createTask({ name: 'Hidden Task' }) },
    });
    await nextTick();

    await wrapper.setProps({ visible: true });
    await nextTick();

    // Seeding happens on the visible→true transition, not before.
    expect((wrapper.find('#task-name').element as HTMLInputElement).value).toBe('Hidden Task');

    wrapper.unmount();
  });
});

describe('TaskUpsertDialog submit side-effects', () => {
  it('shows a success toast and closes the dialog on a successful save', async () => {
    const wrapper = mount(TaskUpsertDialog, {
      ...mountOptions,
      props: { visible: true, task: createTask() },
    });
    await nextTick();

    await submit(wrapper);

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Task updated', detail: 'matrix-reasoning' }),
    );
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);

    wrapper.unmount();
  });

  it('surfaces a callable error message and keeps the dialog open on failure', async () => {
    mutateAsync.mockRejectedValueOnce({ code: 'functions/permission-denied' });
    const wrapper = mount(TaskUpsertDialog, { ...mountOptions, props: { visible: true, task: null } });

    await fillRequiredFields(wrapper);
    await submit(wrapper);

    expect(errorText(wrapper)).toBe('You do not have permission to perform this action.');
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')).toBeUndefined();

    wrapper.unmount();
  });
});
