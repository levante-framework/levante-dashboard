import { describe, expect, it } from 'vitest';
import { isAdminForSite } from './claims';

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
