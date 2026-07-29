import { describe, expect, it } from 'vitest';
import { resolveVariantDisplayName } from '@/helpers';
import { getCallableErrorMessage, semanticIdFromName } from '@/helpers/taskCatalog';

describe('semanticIdFromName', () => {
  it('slugs display names like the backend', () => {
    expect(semanticIdFromName('Matrix Reasoning')).toBe('matrix-reasoning');
    expect(semanticIdFromName('  PA  ')).toBe('pa');
    expect(semanticIdFromName('Hello---World!!!')).toBe('hello-world');
  });

  it('returns empty string when name yields no slug', () => {
    expect(semanticIdFromName('!!!')).toBe('');
    expect(semanticIdFromName('   ')).toBe('');
  });
});

describe('resolveVariantDisplayName', () => {
  it('prefers explicit displayName over internal name', () => {
    expect(resolveVariantDisplayName({ displayName: 'Friendly Label', name: 'en-US' })).toBe('Friendly Label');
  });

  it('falls back to formatted internal name', () => {
    expect(resolveVariantDisplayName({ name: 'en-US' })).toBeTruthy();
    expect(resolveVariantDisplayName({ name: 'en-US' })).not.toBe('Friendly Label');
    expect(resolveVariantDisplayName({ name: 'custom-label' })).toBe('custom-label');
  });
});

describe('getCallableErrorMessage', () => {
  it('maps already-exists and not-found codes', () => {
    expect(getCallableErrorMessage({ code: 'functions/already-exists', message: 'dup' }, 'fallback')).toBe('dup');
    expect(getCallableErrorMessage({ code: 'functions/not-found' }, 'fallback')).toBe('Document not found.');
  });

  it('maps duplicate variant params already-exists', () => {
    expect(
      getCallableErrorMessage(
        { code: 'functions/already-exists', details: { code: 'params' } },
        'fallback',
      ),
    ).toBe('A variant with the same params already exists for this task.');
  });
});
