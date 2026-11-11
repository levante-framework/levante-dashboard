export const APP_NAME = 'LEVANTE';

export const ASSIGNMENT_STATUSES = {
  CURRENT: 'current',
  PAST: 'past',
  UPCOMING: 'upcoming',
};

export const NAVBAR_BLACKLIST = [
  'Login',
  'Maintenance',
  'PA',
  'PlayApp',
  'Register',
  'SRE',
  'SurveyManager',
  'SWR',
  'Translations',
] as const;

export const FOOTER_BLACKLIST = ['Maintenance', 'PA', 'PlayApp', 'SRE', 'SWR'] as const;

export const isLevante: boolean = ((import.meta.env.VITE_LEVANTE as string) ?? '').toUpperCase() === 'TRUE';

export const isEmulator: boolean = ((import.meta.env.VITE_EMULATOR as string) ?? '').toUpperCase() === 'TRUE';
