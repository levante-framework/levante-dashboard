import { describe, expect, it } from 'vitest';
import { diffVariantParams, hasVariantParamDiff } from '@/helpers/diffVariantParams';

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
