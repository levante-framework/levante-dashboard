import { mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvTag from 'primevue/tag';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import TasksCatalogList from '@/components/tasks/TasksCatalogList.vue';
import type { SerializedTask } from '@/types/taskCatalog';

// A plain holder (not a ref) so it can live in vi.hoisted; the mock wraps the
// current values in fresh refs each time the composable is called.
const { queryState } = vi.hoisted(() => ({
  queryState: { data: [] as SerializedTask[], isFetching: false, isError: false },
}));

vi.mock('@/composables/queries/useTasksCatalogQuery', () => ({
  default: () => ({
    data: ref(queryState.data),
    isFetching: ref(queryState.isFetching),
    isError: ref(queryState.isError),
  }),
}));

// The dialog pulls in the upsert mutation/toast; stub it out of catalog tests.
vi.mock('@/components/tasks/TaskUpsertDialog.vue', () => ({
  default: {
    name: 'TaskUpsertDialog',
    props: ['visible', 'task'],
    template: '<div data-testid="task-upsert-dialog" />',
  },
}));

const mountOptions = {
  global: {
    plugins: [PrimeVue],
    directives: {
      tooltip: { mounted() {}, updated() {} },
      ripple: { mounted() {}, updated() {} },
    },
  },
};

const createTask = (overrides: Partial<SerializedTask> = {}): SerializedTask => ({
  id: 'matrix-reasoning',
  archived: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  description: 'Existing description',
  image: '',
  name: 'Matrix Reasoning',
  registered: true,
  updatedAt: '2024-01-02T00:00:00.000Z',
  validUserTypes: ['child', 'teacher'],
  ...overrides,
});

const tagValues = (wrapper: VueWrapper) => wrapper.findAllComponents(PvTag).map((tag) => tag.props('value'));
const cardNames = (wrapper: VueWrapper) => wrapper.findAll('.font-semibold.text-lg').map((el) => el.text());
const dialog = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'TaskUpsertDialog' });
const buttonByText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((btn) => btn.text().includes(text));

beforeEach(() => {
  queryState.data = [];
  queryState.isFetching = false;
  queryState.isError = false;
});

describe('TasksCatalogList states', () => {
  it('shows a loading indicator while fetching', () => {
    queryState.isFetching = true;
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(wrapper.text()).toContain('Loading tasks...');
    expect(wrapper.findAll('article')).toHaveLength(0);

    wrapper.unmount();
  });

  it('shows an error message when the query errors', () => {
    queryState.isError = true;
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(wrapper.text()).toContain('Unable to load tasks');
    expect(wrapper.findAll('article')).toHaveLength(0);

    wrapper.unmount();
  });

  it('shows an empty message when there are no tasks', () => {
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(wrapper.text()).toContain('No tasks found');
    expect(wrapper.findAll('article')).toHaveLength(0);

    wrapper.unmount();
  });
});

describe('TasksCatalogList rendering', () => {
  it('renders one card per task sorted by name', () => {
    queryState.data = [
      createTask({ id: 'mefs', name: 'MEFS' }),
      createTask({ id: 'hearts-and-flowers', name: 'Hearts and Flowers' }),
      createTask({ id: 'adult-reasoning', name: 'Adult Reasoning' }),
    ];
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(wrapper.findAll('article')).toHaveLength(3);
    expect(cardNames(wrapper)).toEqual(['Adult Reasoning', 'Hearts and Flowers', 'MEFS']);

    wrapper.unmount();
  });

  it('falls back to the id when a task has no name', () => {
    queryState.data = [createTask({ id: 'matrix-reasoning', name: '' })];
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(cardNames(wrapper)).toEqual(['matrix-reasoning']);

    wrapper.unmount();
  });

  it('renders a Registered tag for a registered task', () => {
    queryState.data = [createTask({ registered: true })];
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(tagValues(wrapper)).toContain('Registered');
    expect(tagValues(wrapper)).not.toContain('Unregistered');

    wrapper.unmount();
  });

  it('renders an Unregistered tag for an unregistered task', () => {
    queryState.data = [createTask({ registered: false })];
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(tagValues(wrapper)).toContain('Unregistered');
    expect(tagValues(wrapper)).not.toContain('Registered');

    wrapper.unmount();
  });

  it('renders a capitalized tag per valid user type', () => {
    queryState.data = [createTask({ validUserTypes: ['child', 'caregiver', 'teacher'] })];
    const wrapper = mount(TasksCatalogList, mountOptions);

    const values = tagValues(wrapper);
    expect(values).toEqual(expect.arrayContaining(['Child', 'Caregiver', 'Teacher']));

    wrapper.unmount();
  });

  it('shows a dash and no user-type tags when validUserTypes is empty', () => {
    queryState.data = [createTask({ validUserTypes: [] })];
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(wrapper.text()).toContain('—');
    expect(tagValues(wrapper)).not.toContain('Child');

    wrapper.unmount();
  });
});

describe('TasksCatalogList dialog wiring', () => {
  it('opens the dialog in create mode with no task', async () => {
    queryState.data = [createTask()];
    const wrapper = mount(TasksCatalogList, mountOptions);

    expect(dialog(wrapper).props('visible')).toBe(false);

    await buttonByText(wrapper, 'Create task')?.trigger('click');

    expect(dialog(wrapper).props('visible')).toBe(true);
    expect(dialog(wrapper).props('task')).toBeNull();

    wrapper.unmount();
  });

  it('opens the dialog in edit mode seeded with the clicked task', async () => {
    const task = createTask({ id: 'matrix-reasoning', name: 'Matrix Reasoning' });
    queryState.data = [task];
    const wrapper = mount(TasksCatalogList, mountOptions);

    await buttonByText(wrapper, 'Edit')?.trigger('click');

    expect(dialog(wrapper).props('visible')).toBe(true);
    expect(dialog(wrapper).props('task')).toMatchObject({ id: 'matrix-reasoning', name: 'Matrix Reasoning' });

    wrapper.unmount();
  });
});
