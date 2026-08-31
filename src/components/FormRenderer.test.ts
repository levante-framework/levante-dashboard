import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it, vi } from 'vitest';
import type { FormSectionInfo, InformationFormField } from '@levante-framework/levante-zod';
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

function buttonByLabel(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((button) => button.text().includes(label));
  if (!match) throw new Error(`Button "${label}" was not found`);
  return match;
}

async function mountForm(saveDraft = vi.fn().mockResolvedValue(true)) {
  const wrapper = mount(FormRenderer, {
    props: {
      fields: FIELDS,
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
});
