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
  'PA',
  'PlayApp',
  'SRE',
  'SurveyManager',
  'SWR',
  'Translations',
] as const;
