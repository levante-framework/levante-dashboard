import { describe, expect, it } from 'vitest';
import { omitSensitiveSentryFields, sentryUserFromUsername, usernameFromIdentity } from './sentryPrivacy';

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

  it('returns null when neither field is present', () => {
    expect(usernameFromIdentity({})).toBeNull();
  });
});

describe('sentryUserFromUsername', () => {
  it('identifies the user by username only', () => {
    expect(sentryUserFromUsername('quqa2y1jss')).toEqual({ username: 'quqa2y1jss' });
  });
});
