// This test file verifies the useUserType composable functionality:
// - Tests user type determination based on claims (super admin, admin, participant)
// - Validates computed boolean flags for each user type
// - Checks edge cases like missing claims
// - Admin status is site-scoped via siteRoles[currentSite]
// - Uses Vue's computed refs to simulate reactive user claims data
// - Imports required testing utilities from Vitest
import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import { AUTH_USER_TYPE } from '@/constants/auth';
import useUserType from './useUserType';

describe('useUserType', () => {
  it('should return super admin user type when user is a super admin', () => {
    const userClaims = computed(() => ({ super_admin: true }));
    const currentSite = ref('site-123');
    const { userType, isAdmin, isParticipant, isSuperAdmin } = useUserType(userClaims, currentSite);

    expect(userType.value).toBe(AUTH_USER_TYPE.SUPER_ADMIN);
    expect(isAdmin.value).toBe(false);
    expect(isParticipant.value).toBe(false);
    expect(isSuperAdmin.value).toBe(true);
  });

  it('should return admin user type when user has a non-participant role on the current site', () => {
    const userClaims = computed(() => ({
      siteRoles: {
        'site-123': ['admin'],
        'site-456': ['participant'],
      },
    }));
    const currentSite = ref('site-123');
    const { userType, isAdmin, isParticipant, isSuperAdmin } = useUserType(userClaims, currentSite);

    expect(userType.value).toBe(AUTH_USER_TYPE.ADMIN);
    expect(isAdmin.value).toBe(true);
    expect(isParticipant.value).toBe(false);
    expect(isSuperAdmin.value).toBe(false);
  });

  it('should return participant user type when the current site only grants a participant role', () => {
    const userClaims = computed(() => ({
      super_admin: false,
      siteRoles: {
        'site-123': ['admin'],
        'site-456': ['participant'],
      },
    }));
    const currentSite = ref('site-456');
    const { userType, isAdmin, isParticipant, isSuperAdmin } = useUserType(userClaims, currentSite);

    expect(userType.value).toBe(AUTH_USER_TYPE.PARTICIPANT);
    expect(isAdmin.value).toBe(false);
    expect(isParticipant.value).toBe(true);
    expect(isSuperAdmin.value).toBe(false);
  });

  it('should return undefined user type when no claims are provided', () => {
    const userClaims = computed(() => null);
    const currentSite = ref('site-123');
    const { userType, isAdmin, isParticipant, isSuperAdmin } = useUserType(userClaims, currentSite);

    expect(userType.value).toBe(undefined);
    expect(isAdmin.value).toBe(false);
    expect(isParticipant.value).toBe(false);
    expect(isSuperAdmin.value).toBe(false);
  });
});
