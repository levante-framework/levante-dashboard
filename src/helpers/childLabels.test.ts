import { describe, expect, it } from 'vitest';
import { getChildLabel, getChildLetter } from './childLabels';

describe('getChildLetter', () => {
  it('maps zero-based indexes to uppercase Latin letters', () => {
    expect(getChildLetter(0)).toBe('A');
    expect(getChildLetter(25)).toBe('Z');
  });

  it('wraps around after 26', () => {
    expect(getChildLetter(26)).toBe('A');
    expect(getChildLetter(27)).toBe('B');
  });
});

describe('getChildLabel', () => {
  it('returns a "Child X" label for a numeric index', () => {
    expect(getChildLabel(0)).toBe('Child A');
    expect(getChildLabel(25)).toBe('Child Z');
  });

  it('returns an empty string for non-numeric input', () => {
    expect(getChildLabel(undefined)).toBe('');
    expect(getChildLabel(null)).toBe('');
    expect(getChildLabel('1')).toBe('');
  });
});
