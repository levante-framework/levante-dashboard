import { describe, expect, it } from 'vitest';
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

describe('getCallableErrorMessage', () => {
  it('maps already-exists and not-found codes', () => {
    expect(getCallableErrorMessage({ code: 'functions/already-exists', message: 'dup' }, 'fallback')).toBe('dup');
    expect(getCallableErrorMessage({ code: 'functions/not-found' }, 'fallback')).toBe('Document not found.');
  });
});
