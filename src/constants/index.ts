export const APP_NAME = 'LEVANTE';

export const ASSIGNMENT_STATUSES = {
  CURRENT: 'current',
  PAST: 'past',
  UPCOMING: 'upcoming',
};

// @TODO: Remove Login after replacing the login page
export const NAVBAR_BLACKLIST = [
  'Login',
  'Maintenance',
  'OfflineHome',
  'OfflineTask',
  'PA',
  'PlayApp',
  'Register',
  'SignIn',
  'SRE',
  'SurveyManager',
  'SWR',
  'Translations',
] as const;

export const FOOTER_BLACKLIST = [
  'Maintenance',
  'OfflineHome',
  'OfflineTask',
  'PA',
  'PlayApp',
  'SRE',
  'SWR',
] as const;

export const isLevante: boolean = ((import.meta.env.VITE_LEVANTE as string) ?? '').toUpperCase() === 'TRUE';

export const isEmulator: boolean = ((import.meta.env.VITE_EMULATOR as string) ?? '').toUpperCase() === 'TRUE';
