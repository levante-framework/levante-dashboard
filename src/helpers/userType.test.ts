import { describe, expect, it } from 'vitest';
import { getFallbackUserTypeForTask, normalizeUserTypeForBackend, normalizeUserTypeForDisplay } from './userType';

describe('normalizeUserTypeForDisplay', () => {
  it('maps backend values to their display equivalents', () => {
    expect(normalizeUserTypeForDisplay('student')).toBe('child');
    expect(normalizeUserTypeForDisplay('parent')).toBe('caregiver');
  });

  it('passes through values without a display mapping', () => {
    expect(normalizeUserTypeForDisplay('teacher')).toBe('teacher');
    expect(normalizeUserTypeForDisplay('')).toBe('');
  });
});

describe('normalizeUserTypeForBackend', () => {
  it('maps display values to their backend equivalents', () => {
    expect(normalizeUserTypeForBackend('child')).toBe('student');
    expect(normalizeUserTypeForBackend('caregiver')).toBe('parent');
  });

  it('passes through values without a backend mapping', () => {
    expect(normalizeUserTypeForBackend('teacher')).toBe('teacher');
    expect(normalizeUserTypeForBackend('')).toBe('');
  });
});

describe('getFallbackUserTypeForTask', () => {
  it('returns teacher for the teacher survey', () => {
    expect(getFallbackUserTypeForTask('teacher-survey')).toBe('teacher');
  });

  it('returns parent for the caregiver survey and adult reasoning', () => {
    expect(getFallbackUserTypeForTask('caregiver-survey')).toBe('parent');
    expect(getFallbackUserTypeForTask('adult-reasoning')).toBe('parent');
  });

  it('defaults to student for any other task', () => {
    expect(getFallbackUserTypeForTask('vocab')).toBe('student');
    expect(getFallbackUserTypeForTask('intro-survey')).toBe('student');
  });

  it('is case-insensitive on the task id', () => {
    expect(getFallbackUserTypeForTask('TEACHER-SURVEY')).toBe('teacher');
    expect(getFallbackUserTypeForTask('Adult-Reasoning')).toBe('parent');
  });

  it('defaults to student when the task id is missing', () => {
    expect(getFallbackUserTypeForTask()).toBe('student');
    expect(getFallbackUserTypeForTask('')).toBe('student');
  });
});
