import { describe, expect, it } from 'vitest';
import { getDefaultUserTypeForTask, normalizeUserTypeForBackend, normalizeUserTypeForDisplay } from './userType';

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

describe('getDefaultUserTypeForTask', () => {
  it('returns teacher for the teacher survey', () => {
    expect(getDefaultUserTypeForTask('teacher-survey')).toBe('teacher');
  });

  it('returns parent for the caregiver survey and adult reasoning', () => {
    expect(getDefaultUserTypeForTask('caregiver-survey')).toBe('parent');
    expect(getDefaultUserTypeForTask('adult-reasoning')).toBe('parent');
  });

  it('defaults to student for any other task', () => {
    expect(getDefaultUserTypeForTask('vocab')).toBe('student');
    expect(getDefaultUserTypeForTask('intro-survey')).toBe('student');
  });

  it('is case-insensitive on the task id', () => {
    expect(getDefaultUserTypeForTask('TEACHER-SURVEY')).toBe('teacher');
    expect(getDefaultUserTypeForTask('Adult-Reasoning')).toBe('parent');
  });

  it('defaults to student when the task id is missing', () => {
    expect(getDefaultUserTypeForTask()).toBe('student');
    expect(getDefaultUserTypeForTask('')).toBe('student');
  });
});
