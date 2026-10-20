import { mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import PvSelect from 'primevue/select';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import TaskPicker from '@/components/assignments/TaskPicker.vue';
import VariantCard, { type VariantObject } from '@/components/assignments/VariantCard.vue';
import { languageOptions } from '@/translations/i18n';

const { isSuperAdmin, toastAdd, confirmRequire } = vi.hoisted(() => ({
  isSuperAdmin: { current: true },
  toastAdd: vi.fn(),
  confirmRequire: vi.fn(),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    isUserSuperAdmin: () => isSuperAdmin.current,
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: confirmRequire }),
}));

vi.mock('@/components/assignments/EditVariantDialog.vue', () => ({
  default: {
    name: 'EditVariantDialog',
    props: ['assessment', 'updateVariant', 'preExistingAssessmentInfo'],
    template: '<div data-testid="edit-variant-dialog"></div>',
  },
}));

// The drag library mutates the list and then emits `add`. Tests drive those two
// steps directly so the picker's rules can be asserted without Sortable.
vi.mock('vue-draggable-next', () => ({
  VueDraggableNext: {
    name: 'VueDraggableNext',
    props: ['move', 'list', 'modelValue', 'group', 'sort'],
    emits: ['add', 'update:modelValue'],
    template: '<div class="draggable-stub"><slot /></div>',
  },
}));

interface CatalogVariant extends VariantObject {
  task: VariantObject['task'] & { id: string };
}

interface ConfirmRequest {
  header: string;
  message: string;
  accept: () => void;
}

type CardWrapper = VueWrapper<InstanceType<typeof VariantCard>>;

const originalLanguages = { ...languageOptions };

const assignedTo = (userType: string): NonNullable<VariantObject['variant']['conditions']> => ({
  assigned: {
    op: 'AND',
    conditions: [{ field: 'userType', op: 'EQUAL', value: userType }],
  },
});

function createVariant(options: {
  id: string;
  taskId: string;
  taskName: string;
  displayName?: string;
  name?: string;
  language?: string;
  registered?: boolean;
  conditions?: VariantObject['variant']['conditions'];
  validUserTypes?: VariantObject['task']['validUserTypes'];
}): CatalogVariant {
  return {
    id: options.id,
    task: {
      id: options.taskId,
      name: options.taskName,
      ...(options.validUserTypes ? { validUserTypes: options.validUserTypes } : {}),
      image: '/task.png',
    },
    variant: {
      name: options.name ?? options.displayName ?? '',
      displayName: options.displayName,
      registered: options.registered ?? true,
      params: { language: options.language ?? 'en-US' },
      ...(options.conditions ? { conditions: options.conditions } : {}),
    },
  };
}

function catalog(variants: CatalogVariant[]): Record<string, CatalogVariant[]> {
  return variants.reduce<Record<string, CatalogVariant[]>>((groups, item) => {
    groups[item.task.id] = [...(groups[item.task.id] ?? []), item];
    return groups;
  }, {});
}

function mountPicker(
  props: {
    allVariants?: Record<string, VariantObject[]>;
    inputVariants?: VariantObject[];
    preExistingAssessmentInfo?: Array<{
      variantId: string;
      conditions: VariantObject['variant']['conditions'];
    }>;
  } = {},
) {
  return mount(TaskPicker, {
    props: {
      allVariants: props.allVariants ?? {},
      inputVariants: props.inputVariants ?? [],
      preExistingAssessmentInfo: props.preExistingAssessmentInfo ?? [],
    },
    global: {
      plugins: [PrimeVue],
      directives: {
        tooltip: { mounted() {}, updated() {} },
        ripple: { mounted() {}, updated() {} },
      },
    },
  });
}

function variantOf(card: CardWrapper): CatalogVariant {
  return card.props('variant') as CatalogVariant;
}

function cardsIn(wrapper: VueWrapper, selected: boolean): CardWrapper[] {
  return wrapper
    .findAllComponents(VariantCard)
    .filter((card) => Boolean(card.element.closest('[data-cy="panel-droppable-zone"]')) === selected);
}

function availableNames(wrapper: VueWrapper): string[] {
  return cardsIn(wrapper, false).map((card) => variantOf(card).variant.displayName ?? '');
}

function selectedNames(wrapper: VueWrapper): string[] {
  return cardsIn(wrapper, true).map((card) => variantOf(card).variant.displayName ?? '');
}

function emittedVariants(wrapper: VueWrapper): VariantObject[] {
  const events = wrapper.emitted('variants-changed');
  if (!events?.length) throw new Error('variants-changed was not emitted');
  return events[events.length - 1]?.[0] as VariantObject[];
}

function lastConfirm(): ConfirmRequest {
  const request = confirmRequire.mock.calls.at(-1)?.[0] as ConfirmRequest | undefined;
  if (!request) throw new Error('confirm was not requested');
  return request;
}

function selectedList(wrapper: VueWrapper) {
  return wrapper.get('[data-cy="panel-droppable-zone"]').getComponent({ name: 'VueDraggableNext' });
}

async function chooseLanguage(wrapper: VueWrapper, value: string) {
  await wrapper.getComponent(PvSelect).vm.$emit('update:modelValue', { name: value, value });
  await nextTick();
}

async function addVariant(wrapper: VueWrapper, displayName: string) {
  const card = cardsIn(wrapper, false).find((item) => variantOf(item).variant.displayName === displayName);
  if (!card) throw new Error(`Available variant not found: ${displayName}`);
  await card.get('[data-cy="selected-variant"]').trigger('click');
  await nextTick();
}

async function clickIcon(card: CardWrapper | undefined, iconClass: string) {
  if (!card) throw new Error(`Missing card for ${iconClass}`);
  const button = card.findAll('button').find((item) => item.find(`.${iconClass}`).exists());
  if (!button) throw new Error(`Missing ${iconClass} control`);
  await button.trigger('click');
  await nextTick();
}

async function searchFor(wrapper: VueWrapper, term: string) {
  await wrapper.get('[data-cy="input-variant-name"]').setValue(term);
  await vi.advanceTimersByTimeAsync(300);
  await nextTick();
}

function findClearSearchButton(wrapper: VueWrapper) {
  return wrapper.findAll('button').find((button) => {
    const isInSelectedPanel = Boolean(button.element.closest('[data-cy="panel-droppable-zone"]'));
    return !isInSelectedPanel && button.find('.pi-times').exists();
  });
}

async function dropOntoSelected(wrapper: VueWrapper, nextVariants: VariantObject[], dropped: CatalogVariant) {
  const list = selectedList(wrapper);
  await list.vm.$emit('update:modelValue', nextVariants);
  await nextTick();

  const item = document.createElement('div');
  item.id = dropped.id;
  item.dataset.taskId = dropped.task.id;
  await list.vm.$emit('add', {
    item,
    dragged: item,
    from: document.createElement('div'),
    to: document.createElement('div'),
  });
  await nextTick();
}

beforeEach(() => {
  isSuperAdmin.current = true;
  for (const key of Object.keys(languageOptions)) delete languageOptions[key];
  Object.assign(languageOptions, {
    'en-US': { languageMenu: 'English', languageTaskPicker: 'English (United States)' },
    'es-CO': { languageMenu: 'Spanish', languageTaskPicker: 'Spanish (Colombia)' },
    'de-DE': { languageMenu: 'German', languageTaskPicker: 'German (Germany)' },
  });
});

afterAll(() => {
  for (const key of Object.keys(languageOptions)) delete languageOptions[key];
  Object.assign(languageOptions, originalLanguages);
});

describe('TaskPicker', () => {
  describe('task list', () => {
    it('groups tasks into catalog sections and sorts variants by name', () => {
      const wrapper = mountPicker({
        allVariants: catalog([
          createVariant({ id: 'vocab-z', taskId: 'vocab', taskName: 'Vocabulary', displayName: 'Zebra' }),
          createVariant({ id: 'reading', taskId: 'word-reading', taskName: 'Word Reading', displayName: 'Words' }),
          createVariant({ id: 'custom', taskId: 'custom', taskName: 'Custom Probe', displayName: 'Probe' }),
          createVariant({ id: 'vocab-a', taskId: 'vocab', taskName: 'Vocabulary', displayName: 'alpha' }),
          createVariant({ id: 'intro', taskId: 'instructions', taskName: 'Instructions', displayName: 'Welcome' }),
        ]),
      });

      const headers = wrapper.findAllComponents({ name: 'AccordionHeader' }).map((header) => header.text().trim());
      expect(headers).toEqual(['Introduction', 'Language and Literacy', 'Other']);
      expect(wrapper.findAll('.task-section-task-name').map((node) => node.text())).toEqual([
        'Instructions',
        'Vocabulary',
        'Word Reading',
        'Custom Probe',
      ]);
      expect(availableNames(wrapper)).toEqual(['Welcome', 'alpha', 'Zebra', 'Words', 'Probe']);
    });

    it('hides variants that have no name and says when a task has nothing left to show', () => {
      const wrapper = mountPicker({
        allVariants: catalog([
          createVariant({ id: 'vocab-en', taskId: 'vocab', taskName: 'Vocabulary', displayName: 'English vocab' }),
          createVariant({ id: 'vocab-blank', taskId: 'vocab', taskName: 'Vocabulary', displayName: '', name: '' }),
          createVariant({ id: 'math-blank', taskId: 'math', taskName: 'Math', displayName: '', name: '' }),
        ]),
      });

      expect(availableNames(wrapper)).toEqual(['English vocab']);
      expect(wrapper.text()).toContain('No variants to show.');
    });

    it('shows an empty state when the catalog has no tasks', () => {
      const wrapper = mountPicker();
      expect(wrapper.text()).toContain('No tasks available.');
    });

    it('asks for a language before listing tasks when the user is not a super admin', async () => {
      isSuperAdmin.current = false;
      const wrapper = mountPicker({
        allVariants: catalog([
          createVariant({ id: 'vocab-en', taskId: 'vocab', taskName: 'Vocabulary', displayName: 'English vocab' }),
        ]),
      });

      expect(wrapper.text()).toContain('Select a language to display the task list');
      expect(availableNames(wrapper)).toEqual([]);

      await chooseLanguage(wrapper, 'en-US');

      expect(wrapper.text()).not.toContain('Select a language to display the task list');
      expect(availableNames(wrapper)).toEqual(['English vocab']);
    });
  });

  describe('language filter', () => {
    it('matches legacy language codes, every-language variants, and prefix tasks', async () => {
      const wrapper = mountPicker({
        allVariants: catalog([
          createVariant({
            id: 'vocab-en',
            taskId: 'vocab',
            taskName: 'Vocabulary',
            displayName: 'Legacy English',
            language: 'en',
          }),
          createVariant({
            id: 'math-es',
            taskId: 'math',
            taskName: 'Math',
            displayName: 'Legacy Spanish',
            language: 'es',
          }),
          createVariant({
            id: 'memory-de',
            taskId: 'memory',
            taskName: 'Memory',
            displayName: 'Legacy German',
            language: 'de',
          }),
          createVariant({
            id: 'survey',
            taskId: 'child-survey',
            taskName: 'Child Survey',
            displayName: 'Every language',
            language: 'All Languages',
          }),
          createVariant({
            id: 'vocab-gh',
            taskId: 'vocab-gh',
            taskName: 'Vocabulary',
            displayName: 'Ghana vocab',
            language: 'en-GH',
          }),
          createVariant({
            id: 'blank',
            taskId: 'shape',
            taskName: 'Shape Rotation',
            displayName: 'No language',
            language: '',
          }),
          createVariant({
            id: 'swr-gh',
            taskId: 'swr',
            taskName: 'Word Reading',
            displayName: 'Ghana reading',
            language: 'en-GH',
          }),
          createVariant({
            id: 'sre-gb',
            taskId: 'sre',
            taskName: 'Sentence Reading',
            displayName: 'British sentences',
            language: 'en-GB',
          }),
          createVariant({
            id: 'pa-de',
            taskId: 'pa',
            taskName: 'Language Sounds',
            displayName: 'German sounds',
            language: 'de-DE',
          }),
        ]),
      });

      expect(availableNames(wrapper)).toContain('No language');

      await chooseLanguage(wrapper, 'en-US');
      expect(availableNames(wrapper).sort()).toEqual(
        ['British sentences', 'Every language', 'Ghana reading', 'Legacy English'].sort(),
      );

      await chooseLanguage(wrapper, 'es-CO');
      expect(availableNames(wrapper).sort()).toEqual(['Every language', 'Legacy Spanish'].sort());

      await chooseLanguage(wrapper, 'de-DE');
      expect(availableNames(wrapper).sort()).toEqual(['Every language', 'German sounds', 'Legacy German'].sort());
    });
  });

  describe('search', () => {
    // Search results mount while the debounce clock is frozen. Leaving fake
    // timers on keeps later clicks ahead of that clock; restoring real time
    // first makes Vue ignore them.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const stories = createVariant({
      id: 'stories-en',
      taskId: 'stories',
      taskName: 'Stories',
      displayName: 'Picture book',
      name: 'stories-en',
    });
    const adaptive = createVariant({
      id: 'vocab-en',
      taskId: 'vocab',
      taskName: 'Vocabulary',
      displayName: 'Word list',
      name: 'adaptive-pack',
    });
    const spanish = createVariant({
      id: 'stories-es',
      taskId: 'stories-es',
      taskName: 'Stories',
      displayName: 'Cuentos',
      language: 'es-CO',
    });

    it('shows a searching state, then matches task, display, and internal names', async () => {
      const wrapper = mountPicker({ allVariants: catalog([stories, adaptive, spanish]) });

      await wrapper.get('[data-cy="input-variant-name"]').setValue('picture');
      expect(wrapper.text()).toContain('Searching...');
      await vi.advanceTimersByTimeAsync(300);
      await nextTick();

      expect(wrapper.text()).not.toContain('Searching...');
      expect(availableNames(wrapper)).toEqual(['Picture book']);

      await searchFor(wrapper, 'adaptive');
      expect(availableNames(wrapper)).toEqual(['Word list']);

      await searchFor(wrapper, 'stories');
      expect(availableNames(wrapper)).toEqual(['Picture book', 'Cuentos']);

      await chooseLanguage(wrapper, 'es-CO');
      expect(availableNames(wrapper)).toEqual(['Cuentos']);
    });

    it('says when nothing matches and when every match is already selected', async () => {
      const wrapper = mountPicker({ allVariants: catalog([stories]) });

      await searchFor(wrapper, 'zzzz');
      expect(wrapper.text()).toContain('No search results for zzzz');

      await searchFor(wrapper, 'picture');
      await addVariant(wrapper, 'Picture book');
      expect(wrapper.text()).toContain('All search results are already selected.');
    });

    it('clears the search and returns to the grouped list', async () => {
      const wrapper = mountPicker({ allVariants: catalog([stories, adaptive]) });
      expect(findClearSearchButton(wrapper)).toBeUndefined();

      await searchFor(wrapper, 'picture');
      const clearButton = findClearSearchButton(wrapper);
      if (!clearButton) throw new Error('Missing clear search button');
      await clearButton.trigger('click');
      await nextTick();

      expect(findClearSearchButton(wrapper)).toBeUndefined();
      expect(availableNames(wrapper)).toEqual(['Word list', 'Picture book']);
    });
  });

  describe('selection', () => {
    it('adds a variant with a default participant and reports the change', async () => {
      const vocabulary = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const teacher = createVariant({
        id: 'teacher',
        taskId: 'teacher-survey',
        taskName: 'Teacher Survey',
        displayName: 'Teacher check-in',
      });
      const caregiver = createVariant({
        id: 'caregiver',
        taskId: 'caregiver-survey',
        taskName: 'Caregiver Survey',
        displayName: 'Caregiver check-in',
      });
      const reasoning = createVariant({
        id: 'reasoning',
        taskId: 'adult-reasoning',
        taskName: 'Adult Reasoning',
        displayName: 'Adult reasoning',
      });
      const wrapper = mountPicker({ allVariants: catalog([vocabulary, teacher, caregiver, reasoning]) });

      await addVariant(wrapper, 'English vocab');
      await addVariant(wrapper, 'Teacher check-in');
      await addVariant(wrapper, 'Caregiver check-in');
      await addVariant(wrapper, 'Adult reasoning');

      expect(selectedNames(wrapper)).toEqual([
        'English vocab',
        'Teacher check-in',
        'Caregiver check-in',
        'Adult reasoning',
      ]);
      expect(wrapper.get('[data-cy="panel-droppable-zone"]').text()).toContain('Children');
      expect(wrapper.get('[data-cy="panel-droppable-zone"]').text()).toContain('Teachers');
      expect(wrapper.get('[data-cy="panel-droppable-zone"]').text()).toContain('Caregivers');
      expect(vocabulary.variant.conditions).toBeUndefined();

      const selected = emittedVariants(wrapper);
      expect(selected.map((item) => item.variant.conditions)).toEqual([
        assignedTo('student'),
        assignedTo('teacher'),
        assignedTo('parent'),
        assignedTo('parent'),
      ]);
    });

    it('derives the default condition from a single validUserType, overriding the task-id fallback', async () => {
      // caregiver-survey would default to parent via the fallback; validUserTypes wins.
      const survey = createVariant({
        id: 'caregiver',
        taskId: 'caregiver-survey',
        taskName: 'Caregiver Survey',
        displayName: 'Caregiver check-in',
        validUserTypes: ['teacher'],
      });
      const wrapper = mountPicker({ allVariants: catalog([survey]) });

      await addVariant(wrapper, 'Caregiver check-in');

      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual(assignedTo('teacher'));
    });

    it('ORs multiple validUserTypes into the default assigned conditions', async () => {
      const vocabulary = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
        validUserTypes: ['student', 'parent'],
      });
      const wrapper = mountPicker({ allVariants: catalog([vocabulary]) });

      await addVariant(wrapper, 'English vocab');

      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual({
        assigned: {
          op: 'OR',
          conditions: [
            { field: 'userType', op: 'EQUAL', value: 'student' },
            { field: 'userType', op: 'EQUAL', value: 'parent' },
          ],
        },
      });
    });

    it('de-duplicates repeated validUserTypes into a single AND condition', async () => {
      const vocabulary = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
        validUserTypes: ['student', 'student'],
      });
      const wrapper = mountPicker({ allVariants: catalog([vocabulary]) });

      await addVariant(wrapper, 'English vocab');

      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual(assignedTo('student'));
    });

    it('applies stored conditions to tasks already on the assignment', () => {
      const seeded = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const conditions = assignedTo('teacher');
      const wrapper = mountPicker({
        allVariants: catalog([seeded]),
        inputVariants: [seeded],
        preExistingAssessmentInfo: [{ variantId: seeded.id, conditions }],
      });

      expect(seeded.variant.conditions).toBeUndefined();
      expect(cardsIn(wrapper, true)[0]?.text()).toContain('Teachers');
      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual(conditions);
      expect(availableNames(wrapper)).toEqual([]);
    });

    it('writes condition edits back onto the selected variant', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const wrapper = mountPicker({ allVariants: catalog([english]), inputVariants: [english] });
      // TaskPicker binds a `(variantId, conditions) => void` callback through a
      // cast, so the prop's declared `(variant) => void` type needs widening here.
      const updateVariant = cardsIn(wrapper, true)[0]?.props('updateVariant') as unknown as (
        variantId: string,
        conditions: VariantObject['variant']['conditions'],
      ) => void;
      const conditions = assignedTo('parent');

      updateVariant(english.id, conditions);
      await nextTick();

      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual(conditions);
      expect(cardsIn(wrapper, true)[0]?.text()).toContain('Caregivers');
    });

    it('rejects selecting a variant that is already selected', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const wrapper = mountPicker({ allVariants: catalog([english]) });
      const card = cardsIn(wrapper, false)[0];
      if (!card) throw new Error('missing card');

      card.vm.$emit('select', variantOf(card));
      card.vm.$emit('select', variantOf(card));
      await nextTick();

      expect(selectedNames(wrapper)).toEqual(['English vocab']);
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Duplicate',
          detail: 'That variant is already selected.',
        }),
      );
    });

    it('warns when another variant of the same task is already selected', async () => {
      const wrapper = mountPicker({
        allVariants: catalog([
          createVariant({ id: 'vocab-en', taskId: 'vocab', taskName: 'Vocabulary', displayName: 'English vocab' }),
          createVariant({
            id: 'vocab-es',
            taskId: 'vocab',
            taskName: 'Vocabulary',
            displayName: 'Spanish vocab',
            language: 'es-CO',
          }),
        ]),
      });

      await addVariant(wrapper, 'English vocab');
      await addVariant(wrapper, 'Spanish vocab');

      expect(selectedNames(wrapper)).toEqual(['English vocab']);
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'Task Selected',
          detail: 'There is a task with that Task ID already selected.',
        }),
      );
    });

    it('offers to replace a deregistered variant with a registered one', async () => {
      const outdated = createVariant({
        id: 'vocab-old',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Old vocab',
        registered: false,
      });
      const current = createVariant({
        id: 'vocab-new',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Current vocab',
      });
      const wrapper = mountPicker({
        allVariants: catalog([outdated, current]),
        inputVariants: [outdated],
      });

      await addVariant(wrapper, 'Current vocab');

      expect(selectedNames(wrapper)).toEqual(['Old vocab']);
      expect(lastConfirm().header).toBe('Replace deregistered task?');

      lastConfirm().accept();
      await nextTick();

      expect(selectedNames(wrapper)).toEqual(['Current vocab']);
      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual(assignedTo('student'));
    });

    it('warns instead of replacing when the incoming variant is also deregistered', async () => {
      const outdated = createVariant({
        id: 'vocab-old',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Old vocab',
        registered: false,
      });
      const other = createVariant({
        id: 'vocab-other',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Other old vocab',
        registered: false,
      });
      const wrapper = mountPicker({
        allVariants: catalog([outdated, other]),
        inputVariants: [outdated],
      });

      await addVariant(wrapper, 'Other old vocab');

      expect(confirmRequire).not.toHaveBeenCalled();
      expect(selectedNames(wrapper)).toEqual(['Old vocab']);
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', summary: 'Task Selected' }));
    });
  });

  describe('selected list', () => {
    it('removes a registered variant immediately', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const wrapper = mountPicker({ allVariants: catalog([english]), inputVariants: [english] });

      await clickIcon(cardsIn(wrapper, true)[0], 'pi-times');

      expect(selectedNames(wrapper)).toEqual([]);
      expect(confirmRequire).not.toHaveBeenCalled();
      expect(availableNames(wrapper)).toEqual(['English vocab']);
    });

    it('asks before removing a deregistered variant', async () => {
      const outdated = createVariant({
        id: 'vocab-old',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Old vocab',
        registered: false,
      });
      const wrapper = mountPicker({ allVariants: catalog([outdated]), inputVariants: [outdated] });

      await clickIcon(cardsIn(wrapper, true)[0], 'pi-times');

      expect(selectedNames(wrapper)).toEqual(['Old vocab']);
      expect(lastConfirm().header).toBe('Remove deregistered task?');
      expect(lastConfirm().message).toContain("you won't be able to add it back again");

      lastConfirm().accept();
      await nextTick();

      expect(selectedNames(wrapper)).toEqual([]);
    });

    it('reorders selected variants with the up and down controls', async () => {
      const wrapper = mountPicker({
        allVariants: catalog([
          createVariant({ id: 'vocab-en', taskId: 'vocab', taskName: 'Vocabulary', displayName: 'Alpha' }),
          createVariant({ id: 'math-en', taskId: 'math', taskName: 'Math', displayName: 'Beta' }),
        ]),
      });

      await addVariant(wrapper, 'Alpha');
      await addVariant(wrapper, 'Beta');
      expect(selectedNames(wrapper)).toEqual(['Alpha', 'Beta']);

      await clickIcon(cardsIn(wrapper, true)[1], 'pi-sort-up');
      expect(selectedNames(wrapper)).toEqual(['Beta', 'Alpha']);

      await clickIcon(cardsIn(wrapper, true)[0], 'pi-sort-down');
      expect(selectedNames(wrapper)).toEqual(['Alpha', 'Beta']);

      await clickIcon(cardsIn(wrapper, true)[0], 'pi-sort-up');
      expect(selectedNames(wrapper)).toEqual(['Alpha', 'Beta']);
    });

    it('blocks dragging a variant that is already selected from another list', () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const wrapper = mountPicker({ allVariants: catalog([english]), inputVariants: [english] });
      const move = selectedList(wrapper).props('move') as (event: {
        item: HTMLElement;
        from: HTMLElement;
        to: HTMLElement;
        dragged: HTMLElement;
      }) => boolean;
      const from = document.createElement('div');
      const dragged = document.createElement('div');
      dragged.id = english.id;

      expect(move({ item: dragged, from, to: from, dragged })).toBe(true);
      expect(toastAdd).not.toHaveBeenCalled();

      expect(move({ item: dragged, from, to: document.createElement('div'), dragged })).toBe(false);
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Duplicate' }));
    });

    it('keeps a dropped variant when that task is not already selected', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const math = createVariant({ id: 'math-en', taskId: 'math', taskName: 'Math', displayName: 'Math basics' });
      const wrapper = mountPicker({ allVariants: catalog([english, math]), inputVariants: [english] });

      await dropOntoSelected(wrapper, [english, math], math);

      expect(selectedNames(wrapper)).toEqual(['English vocab', 'Math basics']);
      expect(toastAdd).not.toHaveBeenCalled();
      expect(confirmRequire).not.toHaveBeenCalled();
    });

    it('seeds default userType conditions on a dropped variant', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const math = createVariant({ id: 'math-en', taskId: 'math', taskName: 'Math', displayName: 'Math basics' });
      const wrapper = mountPicker({ allVariants: catalog([english, math]), inputVariants: [english] });

      await dropOntoSelected(wrapper, [english, math], math);

      const dropped = emittedVariants(wrapper).find((variant) => variant.id === 'math-en');
      expect(dropped?.variant.conditions).toEqual(assignedTo('student'));
    });

    it('seeds a dropped variant from its validUserTypes', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const survey = createVariant({
        id: 'teacher-survey-1',
        taskId: 'teacher-survey',
        taskName: 'Teacher Survey',
        displayName: 'Teacher survey',
      });
      survey.task.validUserTypes = ['teacher'];
      const wrapper = mountPicker({ allVariants: catalog([english, survey]), inputVariants: [english] });

      await dropOntoSelected(wrapper, [english, survey], survey);

      const dropped = emittedVariants(wrapper).find((variant) => variant.id === 'teacher-survey-1');
      expect(dropped?.variant.conditions).toEqual(assignedTo('teacher'));
    });

    it('removes a dropped duplicate and warns', async () => {
      const english = createVariant({
        id: 'vocab-en',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'English vocab',
      });
      const spanish = createVariant({
        id: 'vocab-es',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Spanish vocab',
        language: 'es-CO',
      });
      const wrapper = mountPicker({
        allVariants: catalog([english, spanish]),
        inputVariants: [english],
      });

      await dropOntoSelected(wrapper, [spanish, english], spanish);

      expect(selectedNames(wrapper)).toEqual(['English vocab']);
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', summary: 'Task Selected' }));
    });

    it('replaces a deregistered variant when a registered one is dropped ahead of it', async () => {
      const outdated = createVariant({
        id: 'vocab-old',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Old vocab',
        registered: false,
      });
      const current = createVariant({
        id: 'vocab-new',
        taskId: 'vocab',
        taskName: 'Vocabulary',
        displayName: 'Current vocab',
      });
      const wrapper = mountPicker({
        allVariants: catalog([outdated, current]),
        inputVariants: [outdated],
      });

      await dropOntoSelected(wrapper, [current, outdated], current);

      expect(selectedNames(wrapper)).toEqual(['Old vocab']);
      lastConfirm().accept();
      await nextTick();

      expect(selectedNames(wrapper)).toEqual(['Current vocab']);
      expect(emittedVariants(wrapper)[0]?.variant.conditions).toEqual(assignedTo('student'));
    });
  });
});
