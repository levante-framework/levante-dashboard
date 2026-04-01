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
