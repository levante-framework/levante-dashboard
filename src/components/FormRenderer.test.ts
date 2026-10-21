import type { FormSectionInfo, InformationFormField } from '@levante-framework/levante-zod';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it, vi } from 'vitest';
import FormRenderer from './FormRenderer.vue';

const FIELDS: InformationFormField[] = [
  {
    itemId: 'site_01',
    variableName: 'sampleApproach',
    kind: 'multi-select',
    required: true,
    sectionId: 'recruitment',
    questionText: 'How did you recruit?',
    options: [
      { value: 'convenience', label: 'Convenience' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    itemId: 'site_01b',
    variableName: 'sampleApproachOther',
    kind: 'text',
    required: true,
    sectionId: 'recruitment',
    questionText: 'Please specify',
    displayLogic: { field: 'sampleApproach', includes: 'other' },
  },
  {
    itemId: 'site_02',
    variableName: 'siteRecruitment',
    kind: 'text',
    required: true,
    sectionId: 'recruitment',
    questionText: 'Recruitment notes',
    infoExample:
      '<p>For example,</p><ul><li>Family-based remote assessment.</li><li>School-based data collection.</li></ul>',
  },
  {
    itemId: 'site_03',
    variableName: 'numStudents',
    kind: 'number',
    required: true,
    sectionId: 'size',
    questionText: 'How many students?',
  },
];

const SECTION_INFO: FormSectionInfo[] = [
  { sectionId: 'recruitment', title: 'Recruitment', description: '' },
  { sectionId: 'size', title: 'Size', description: '' },
];

const LANGUAGE_FIELD: InformationFormField = {
  itemId: 'site_15',
  variableName: 'siteLanguages',
  kind: 'language-selection',
  required: true,
  sectionId: 'recruitment',
  questionText: 'Spoken languages',
};

function buttonByLabel(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((button) => button.text().includes(label));
  if (!match) throw new Error(`Button "${label}" was not found`);
  return match;
}

async function mountForm(saveDraft = vi.fn().mockResolvedValue(true), extraFields: InformationFormField[] = []) {
  const wrapper = mount(FormRenderer, {
    props: {
      fields: [...FIELDS, ...extraFields],
      generalPrompt: 'Please complete.',
      sectionInfo: SECTION_INFO,
      saveDraft,
    },
    global: {
      plugins: [PrimeVue],
      stubs: { Dialog: true },
    },
  });
  return { wrapper, saveDraft };
}

async function startRecruitment(wrapper: VueWrapper) {
  await buttonByLabel(wrapper, 'Get started').trigger('click');
  await flushPromises();
}

async function setApproach(wrapper: VueWrapper, values: string[]) {
  await wrapper.findComponent({ name: 'MultiSelect' }).vm.$emit('update:modelValue', values);
  await flushPromises();
}

function languageSelect(wrapper: VueWrapper) {
  const select = wrapper
    .findAllComponents({ name: 'MultiSelect' })
    .find((component) => component.attributes('id') === 'site_15');
  if (!select) throw new Error('language MultiSelect was not found');
  return select;
}

async function setLanguages(wrapper: VueWrapper, codes: string[]) {
  await languageSelect(wrapper).vm.$emit('update:modelValue', codes);
  await flushPromises();
}

describe('FormRenderer', () => {
  it('pages through intro and sections with Previous and Section X of Y', async () => {
    const { wrapper, saveDraft } = await mountForm();

    expect(wrapper.text()).toContain('Please complete.');
    expect(wrapper.text()).not.toContain('Section');
    expect(saveDraft).not.toHaveBeenCalled();

    await startRecruitment(wrapper);
    expect(wrapper.text()).toContain('Recruitment');
    expect(wrapper.text()).toContain('Section 1 of 2');
    expect(saveDraft).not.toHaveBeenCalled();

    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Size');
    expect(wrapper.text()).toContain('Section 2 of 2');
    expect(buttonByLabel(wrapper, 'Submit').exists()).toBe(true);

    await buttonByLabel(wrapper, 'Previous').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Recruitment');
    expect(wrapper.text()).toContain('Section 1 of 2');
  });

  it('blocks Next when a required field is empty or only whitespace', async () => {
    const { wrapper } = await mountForm();
    await startRecruitment(wrapper);

    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('This field is required');
    expect(wrapper.text()).toContain('Section 1 of 2');

    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('   ');
    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('This field is required');
    expect(wrapper.text()).toContain('Section 1 of 2');
  });

  it('gives the language MultiSelect English options, no bh, and search', async () => {
    const { wrapper } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);

    const select = languageSelect(wrapper);
    const options = select.props('options') as Array<{ value: string; label: string }>;
    expect(options).toContainEqual({ value: 'en', label: 'English' });
    expect(options.map((option) => option.value)).not.toContain('bh');
    expect(select.props('filter')).toBe(true);
  });

  it('shows the language Other textarea only when Other is selected', async () => {
    const { wrapper } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);

    expect(wrapper.find('#site_15-other').exists()).toBe(false);

    await setLanguages(wrapper, ['other']);
    expect(wrapper.find('#site_15-other').exists()).toBe(true);
    expect(wrapper.get('#site_15-other').attributes('aria-label')).toBe('Other (Describe)');

    await setLanguages(wrapper, ['en']);
    expect(wrapper.find('#site_15-other').exists()).toBe(false);
  });

  it('blocks Next when required language-selection has no codes', async () => {
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');

    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('This field is required');
    expect(wrapper.text()).toContain('Section 1 of 2');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('blocks Save when Other is selected without a description', async () => {
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['other']);

    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('This field is required');
    expect(wrapper.get('#site_15-other').classes()).toContain('p-invalid');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('blocks Save when Other description is only whitespace', async () => {
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['other']);
    await wrapper.get('#site_15-other').setValue('   ');

    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('This field is required');
    expect(wrapper.get('#site_15-other').classes()).toContain('p-invalid');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('allows Next when a language is selected', async () => {
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['en']);

    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Section 2 of 2');
    expect(saveDraft).toHaveBeenCalled();
  });

  it('saves selected languages and a trimmed Other description', async () => {
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['en']);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteLanguages: { codes: ['en'], otherDescription: null },
    });

    await setLanguages(wrapper, ['en', 'other']);
    await wrapper.get('#site_15-other').setValue('  Quechua  ');
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteLanguages: { codes: ['en', 'other'], otherDescription: 'Quechua' },
    });
  });

  it('keeps ISO codes when optional Other has no description', async () => {
    const optionalLanguage: InformationFormField = { ...LANGUAGE_FIELD, required: false };
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [optionalLanguage]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['en', 'other']);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteLanguages: { codes: ['en'], otherDescription: null },
    });
  });

  it('sends null when optional Other has no description and no ISO codes', async () => {
    const optionalLanguage: InformationFormField = { ...LANGUAGE_FIELD, required: false };
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [optionalLanguage]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['other']);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteLanguages: null,
    });
  });

  it('sends null when an optional language selection is cleared', async () => {
    const optionalLanguage: InformationFormField = { ...LANGUAGE_FIELD, required: false };
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [optionalLanguage]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['en']);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    await setLanguages(wrapper, []);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteLanguages: null,
    });
  });

  it('drops Other description when Other is removed', async () => {
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [LANGUAGE_FIELD]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await setLanguages(wrapper, ['en', 'other']);
    await wrapper.get('#site_15-other').setValue('Quechua');
    await setLanguages(wrapper, ['en']);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteLanguages: { codes: ['en'], otherDescription: null },
    });
  });

  it('shows Other text only when Other is selected', async () => {
    const { wrapper } = await mountForm();
    await startRecruitment(wrapper);

    expect(wrapper.text()).not.toContain('Please specify');

    await setApproach(wrapper, ['other']);
    expect(wrapper.text()).toContain('Please specify');

    await setApproach(wrapper, ['convenience']);
    expect(wrapper.text()).not.toContain('Please specify');
  });

  it('keeps digits only and clears the numbers-only error on blur', async () => {
    const { wrapper } = await mountForm();
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();

    const input = wrapper.get('#site_03');
    await input.setValue('12a3');
    await flushPromises();
    expect(wrapper.text()).toContain('Numbers only');
    expect((input.element as HTMLInputElement).value).toBe('123');

    await input.trigger('blur');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Numbers only');
  });

  it('disables Previous while a save is in progress', async () => {
    const { wrapper } = await mountForm();
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();

    await wrapper.setProps({ isSaving: true });
    await flushPromises();

    expect(buttonByLabel(wrapper, 'Previous').attributes('disabled')).toBeDefined();
  });

  it('does not submit from a non-last page', async () => {
    const { wrapper } = await mountForm();
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Section 1 of 2');
  });

  it('advances Next only after a successful draft save', async () => {
    const saveDraft = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { wrapper } = await mountForm(saveDraft);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');

    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Section 1 of 2');

    await buttonByLabel(wrapper, 'Next').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Section 2 of 2');
    expect(saveDraft).toHaveBeenCalledTimes(2);
  });

  it('sends null for Other text after displayLogic hides it', async () => {
    const { wrapper, saveDraft } = await mountForm();
    await startRecruitment(wrapper);

    await setApproach(wrapper, ['other']);
    await wrapper.get('#site_01b').setValue('word of mouth');
    await wrapper.get('#site_02').setValue('email');
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    await setApproach(wrapper, ['convenience']);
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
    });
  });

  it('sends null when an optional answer is cleared', async () => {
    const optionalNotes: InformationFormField = {
      itemId: 'site_02b',
      variableName: 'siteNotes',
      kind: 'text',
      required: false,
      sectionId: 'recruitment',
      questionText: 'Optional notes',
    };
    const { wrapper, saveDraft } = await mountForm(vi.fn().mockResolvedValue(true), [optionalNotes]);
    await startRecruitment(wrapper);
    await setApproach(wrapper, ['convenience']);
    await wrapper.get('#site_02').setValue('email');
    await wrapper.get('#site_02b').setValue('old note');
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    await wrapper.get('#site_02b').setValue('');
    await buttonByLabel(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(saveDraft.mock.calls.at(-1)?.[0]).toEqual({
      sampleApproach: ['convenience'],
      sampleApproachOther: null,
      siteRecruitment: 'email',
      siteNotes: null,
    });
  });

  it('renders example HTML lists as stored instead of rewriting them to paragraphs', async () => {
    const wrapper = mount(FormRenderer, {
      props: {
        fields: FIELDS,
        generalPrompt: 'Please complete.',
        sectionInfo: SECTION_INFO,
        saveDraft: vi.fn().mockResolvedValue(true),
      },
      global: {
        plugins: [PrimeVue],
        stubs: {
          Dialog: {
            template: '<div><slot name="header" /><slot /></div>',
          },
        },
      },
    });
    await startRecruitment(wrapper);

    await wrapper.get('.survey-form__example-trigger').trigger('click');
    await flushPromises();

    const example = wrapper.get('.survey-form__example-panel');
    expect(example.html()).toContain('<ul>');
    expect(example.html()).toContain('<li>');
    expect(example.html()).not.toMatch(/<p>Family-based remote assessment\.<\/p>/);
  });
});
