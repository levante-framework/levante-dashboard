export function normalizeUserTypeForDisplay(userType = ''): string {
  if (userType === 'student') return 'child';
  if (userType === 'parent') return 'caregiver';
  return userType;
}

export function normalizeUserTypeForBackend(userType = ''): string {
  if (userType === 'caregiver') return 'parent';
  if (userType === 'child') return 'student';
  return userType;
}
