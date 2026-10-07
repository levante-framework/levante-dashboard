import { describe, expect, it } from 'vitest';
import {
  identitySiteName,
  omitSensitiveSentryFields,
  sentryUserFromUsername,
  usernameFromIdentity,
} from './sentryPrivacy';

describe('omitSensitiveSentryFields', () => {
  it('drops trial payloads and demographics while keeping operational ids', () => {
    const extra = omitSensitiveSentryFields({
      source: 'writeTrial',
      administrationId: 'admin-1',
      userParams: { birthMonth: 6, birthYear: 2015 },
      gameParams: { taskName: 'vocab', age: 8 },
      context: {
        source: 'writeTrial',
        data: { response: 'left', correct: true, itemId: 'item-1' },
      },
      email: 'child@example.com',
      uid: 'firebase-uid',
    });

    expect(extra).toEqual({
      source: 'writeTrial',
      administrationId: 'admin-1',
      context: { source: 'writeTrial' },
    });
  });
});

describe('usernameFromIdentity', () => {
  it('prefers the user-doc username over email', () => {
    expect(usernameFromIdentity({ username: 'quqa2y1jss', email: 'other@stanford.edu' })).toBe('quqa2y1jss');
  });

  it('strips an email domain from username or email', () => {
    expect(usernameFromIdentity({ username: 'quqa2y1jss@levante.com' })).toBe('quqa2y1jss');
    expect(usernameFromIdentity({ email: 'david81@stanford.edu' })).toBe('david81');
  });

  it('appends site name when provided', () => {
    expect(usernameFromIdentity({ username: 'maria', siteName: 'Lincoln' })).toBe('maria@Lincoln');
    expect(usernameFromIdentity({ email: 'david81@stanford.edu', siteName: ' Site A ' })).toBe('david81@Site A');
  });

  it('returns null when neither field is present', () => {
    expect(usernameFromIdentity({})).toBeNull();
  });
});

describe('identitySiteName', () => {
  it('picks a stable site name so role order does not change identity', () => {
    expect(identitySiteName([{ siteName: 'Washington' }, { siteName: 'Lincoln' }])).toBe('Lincoln');
    expect(identitySiteName([{ siteName: 'Lincoln' }, { siteName: 'Washington' }])).toBe('Lincoln');
  });

  it('returns null when no site names are present', () => {
    expect(identitySiteName([])).toBeNull();
    expect(identitySiteName([{ siteName: '  ' }])).toBeNull();
  });
});

describe('sentryUserFromUsername', () => {
  it('identifies the user by username only', () => {
    expect(sentryUserFromUsername('quqa2y1jss')).toEqual({ username: 'quqa2y1jss' });
  });
});
