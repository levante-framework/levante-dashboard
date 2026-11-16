import { Iso6391Alpha2Schema, LANGUAGE_OTHER } from '@levante-framework/levante-zod';
import { describe, expect, it } from 'vitest';
import { languageSelectionOptions } from './languageSelectionOptions';

const isoOptions = languageSelectionOptions.slice(0, -1);
const otherOption = languageSelectionOptions.at(-1);

describe('languageSelectionOptions', () => {
  it('omits deprecated bh and keeps only Zod ISO codes', () => {
    expect(isoOptions.map((option) => option.value)).not.toContain('bh');
    for (const option of isoOptions) {
      expect(Iso6391Alpha2Schema.parse(option.value)).toEqual(option.value);
    }
  });

  it('uses English labels', () => {
    expect(isoOptions.find((option) => option.value === 'en')).toEqual({ value: 'en', label: 'English' });
    expect(isoOptions.find((option) => option.value === 'es')).toEqual({ value: 'es', label: 'Spanish' });
  });

  it('sorts ISO options by English label', () => {
    const labels = isoOptions.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((left, right) => left.localeCompare(right, 'en')));
  });

  it('appends Other (Describe) last', () => {
    expect(otherOption).toEqual({ value: LANGUAGE_OTHER, label: 'Other (Describe)' });
    expect(isoOptions.map((option) => option.value)).not.toContain(LANGUAGE_OTHER);
  });

  it('has unique values', () => {
    const values = languageSelectionOptions.map((option) => option.value);
    expect(new Set(values).size).toEqual(values.length);
  });
});
