import { describe, expect, it } from 'vitest';
import {
  collectVariantParamOptions,
  createVariantParamFilterClause,
  filterVariantsByParamQuery,
  serializeVariantParamValue,
  type VariantParamFilterClause,
  variantMatchesParamFilters,
} from '@/helpers/filterVariantsByParamQuery';
import type { SerializedTaskVariant } from '@/types/taskCatalog';

function variant(id: string, params: SerializedTaskVariant['params']): SerializedTaskVariant {
  return {
    id,
    taskId: 'task-1',
    name: id,
    params,
    registered: true,
    archived: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } as SerializedTaskVariant;
}

function clause(partial: Partial<VariantParamFilterClause>): VariantParamFilterClause {
  return {
    ...createVariantParamFilterClause('AND', partial.id ?? 'clause'),
    ...partial,
  };
}

describe('collectVariantParamOptions', () => {
  it('unions keys and unique values across variants', () => {
    const options = collectVariantParamOptions([
      variant('a', { language: 'en', corpus: 'alpha' }),
      variant('b', { language: 'es', skipInstructions: true }),
      variant('c', { language: 'en', skipInstructions: false }),
    ]);

    expect(options.keys).toEqual(['corpus', 'language', 'skipInstructions']);
    expect(options.valuesByKey.language.map((option) => option.token)).toEqual([
      serializeVariantParamValue('en'),
      serializeVariantParamValue('es'),
    ]);
    expect(options.valuesByKey.skipInstructions.map((option) => option.token)).toEqual([
      serializeVariantParamValue(false),
      serializeVariantParamValue(true),
    ]);
  });
});

describe('variantMatchesParamFilters', () => {
  it('matches all variants when no complete clauses exist', () => {
    expect(variantMatchesParamFilters({ language: 'en' }, [clause({ key: null, valueToken: null })])).toBe(true);
  });

  it('requires the param to exist and equal the selected value', () => {
    const languageEn = clause({
      key: 'language',
      valueToken: serializeVariantParamValue('en'),
    });
    expect(variantMatchesParamFilters({ language: 'en' }, [languageEn])).toBe(true);
    expect(variantMatchesParamFilters({ language: 'es' }, [languageEn])).toBe(false);
    expect(variantMatchesParamFilters({}, [languageEn])).toBe(false);
  });

  it('evaluates AND tighter than OR', () => {
    const clauses = [
      clause({
        id: '1',
        join: 'AND',
        key: 'language',
        valueToken: serializeVariantParamValue('en'),
      }),
      clause({
        id: '2',
        join: 'AND',
        key: 'corpus',
        valueToken: serializeVariantParamValue('alpha'),
      }),
      clause({
        id: '3',
        join: 'OR',
        key: 'language',
        valueToken: serializeVariantParamValue('es'),
      }),
    ];

    expect(variantMatchesParamFilters({ language: 'en', corpus: 'alpha' }, clauses)).toBe(true);
    expect(variantMatchesParamFilters({ language: 'en', corpus: 'beta' }, clauses)).toBe(false);
    expect(variantMatchesParamFilters({ language: 'es' }, clauses)).toBe(true);
  });
});

describe('filterVariantsByParamQuery', () => {
  it('returns the original list when filters are incomplete', () => {
    const variants = [variant('a', { language: 'en' }), variant('b', { language: 'es' })];
    expect(filterVariantsByParamQuery(variants, [clause({ key: 'language' })])).toEqual(variants);
  });

  it('filters to matching variants', () => {
    const variants = [
      variant('a', { language: 'en', skipInstructions: true }),
      variant('b', { language: 'es', skipInstructions: true }),
      variant('c', { language: 'en', skipInstructions: false }),
    ];
    const clauses = [
      clause({
        id: '1',
        key: 'language',
        valueToken: serializeVariantParamValue('en'),
      }),
      clause({
        id: '2',
        join: 'AND',
        key: 'skipInstructions',
        valueToken: serializeVariantParamValue(true),
      }),
    ];

    expect(filterVariantsByParamQuery(variants, clauses).map((item) => item.id)).toEqual(['a']);
  });
});
