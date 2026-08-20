import { describe, expect, it } from 'vitest';
import { diffVariantParams, hasVariantParamDiff, sortVariantsByCreatedAt } from '@/helpers/diffVariantParams';

describe('diffVariantParams', () => {
  it('detects added, removed, and changed params', () => {
    const diff = diffVariantParams({ a: 1, b: 'keep', c: true }, { b: 'keep', c: false, d: 'new' });

    expect(diff.added).toEqual({ d: 'new' });
    expect(diff.removed).toEqual({ a: 1 });
    expect(diff.changed).toEqual({ c: { from: true, to: false } });
    expect(hasVariantParamDiff(diff)).toBe(true);
  });

  it('returns empty diff when params are identical', () => {
    const diff = diffVariantParams({ a: 1 }, { a: 1 });
    expect(diff).toEqual({ added: {}, removed: {}, changed: {} });
    expect(hasVariantParamDiff(diff)).toBe(false);
  });

  it('treats missing previous as all added', () => {
    const diff = diffVariantParams(undefined, { a: 1 });
    expect(diff.added).toEqual({ a: 1 });
    expect(diff.removed).toEqual({});
    expect(diff.changed).toEqual({});
  });
});

describe('sortVariantsByCreatedAt', () => {
  it('sorts ascending by createdAt by default', () => {
    const sorted = sortVariantsByCreatedAt([
      { id: 'b', createdAt: '2024-02-01T00:00:00.000Z' },
      { id: 'a', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'c', createdAt: '2024-03-01T00:00:00.000Z' },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts descending when ascending is false', () => {
    const sorted = sortVariantsByCreatedAt(
      [
        { id: 'a', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'b', createdAt: '2024-02-01T00:00:00.000Z' },
      ],
      false,
    );

    expect(sorted.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
