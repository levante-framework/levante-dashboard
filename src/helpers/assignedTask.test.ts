import { describe, expect, it } from 'vitest';
import { assignmentIncludesTask, isUnassignedTaskError } from './assignedTask';

describe('assignmentIncludesTask', () => {
  it('is true when the assignment assessments include the task id', () => {
    expect(assignmentIncludesTask({ assessments: [{ taskId: 'swr' }, { taskId: 'caregiver-survey' }] }, 'swr')).toBe(
      true,
    );
  });

  it('is false when the task is absent, or the assignment has no assessments', () => {
    expect(assignmentIncludesTask({ assessments: [{ taskId: 'caregiver-survey' }] }, 'swr')).toBe(false);
    expect(assignmentIncludesTask({ assessments: [] }, 'swr')).toBe(false);
    expect(assignmentIncludesTask({}, 'swr')).toBe(false);
    expect(assignmentIncludesTask(null, 'swr')).toBe(false);
    expect(assignmentIncludesTask({ assessments: [{ taskId: 'swr' }] }, '')).toBe(false);
  });
});

describe('isUnassignedTaskError', () => {
  it('matches a callable not-found, with or without the functions prefix', () => {
    expect(isUnassignedTaskError({ code: 'functions/not-found' })).toBe(true);
    expect(isUnassignedTaskError({ code: 'not-found' })).toBe(true);
  });

  it('does not match other failures', () => {
    expect(isUnassignedTaskError({ code: 'functions/internal' })).toBe(false);
    expect(isUnassignedTaskError({ code: 'permission-denied' })).toBe(false);
    expect(isUnassignedTaskError(new Error('boom'))).toBe(false);
    expect(isUnassignedTaskError(null)).toBe(false);
  });
});
