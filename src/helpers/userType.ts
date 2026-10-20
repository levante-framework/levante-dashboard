import type { RoarUserType } from '@/types/userType';

export function normalizeUserTypeForDisplay(userType = ''): string {
  if (userType.toLowerCase() === 'student') return 'child';
  if (userType.toLowerCase() === 'parent') return 'caregiver';
  return userType;
}

export function normalizeUserTypeForBackend(userType = ''): string {
  if (userType.toLowerCase() === 'caregiver') return 'parent';
  if (userType.toLowerCase() === 'child') return 'student';
  return userType;
}

/**
 * Default backend user type for a task, used to seed assigned conditions when a
 * task has not been backfilled with `validUserTypes`.
 */
export function getDefaultUserTypeForTask(taskId = ''): RoarUserType {
  const id = taskId.toLowerCase();
  if (id === 'teacher-survey') return 'teacher';
  if (id === 'caregiver-survey' || id === 'adult-reasoning') return 'parent';
  return 'student';
}
