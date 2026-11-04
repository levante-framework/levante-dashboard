import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import { AUTH_USER_TYPE } from '@/constants/auth';
import useUserType, { isAdminForSite } from './useUserType';

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

  it('recomputes when the current site changes (dual-role user)', () => {
    const userClaims = computed(() => ({
      siteRoles: {
        'site-123': ['admin'],
        'site-456': ['participant'],
      },
    }));
    const currentSite = ref('site-123');
    const { isAdmin, isParticipant } = useUserType(userClaims, currentSite);

    expect(isAdmin.value).toBe(true);
    expect(isParticipant.value).toBe(false);

    currentSite.value = 'site-456';

    expect(isAdmin.value).toBe(false);
    expect(isParticipant.value).toBe(true);
  });
});

describe('isAdminForSite', () => {
  it('returns false for null claims', () => {
    expect(isAdminForSite(null, 'site-123')).toBe(false);
  });

  it('returns true for a super admin even when the current site is not in siteRoles', () => {
    expect(isAdminForSite({ super_admin: true, siteRoles: { 'other-site': ['admin'] } }, 'site-123')).toBe(true);
  });

  it('returns true for a super admin even when the current site is null', () => {
    expect(isAdminForSite({ super_admin: true }, null)).toBe(true);
  });

  it('returns false when the current site is null and the user is not a super admin', () => {
    expect(isAdminForSite({ siteRoles: { 'site-123': ['admin'] } }, null)).toBe(false);
  });

  it('returns false when siteRoles is missing', () => {
    expect(isAdminForSite({ super_admin: false }, 'site-123')).toBe(false);
  });

  it('returns false when the current site only grants a participant role', () => {
    expect(isAdminForSite({ siteRoles: { 'site-123': ['participant'] } }, 'site-123')).toBe(false);
  });

  it('returns true when the current site grants a non-participant role alongside participant', () => {
    expect(isAdminForSite({ siteRoles: { 'site-123': ['participant', 'admin'] } }, 'site-123')).toBe(true);
  });
});
