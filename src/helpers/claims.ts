import { ROLES } from '@/constants/roles';

/**
 * The subset of custom claims needed to determine site-scoped admin privileges.
 */
interface SiteScopedClaims {
  super_admin?: boolean;
  siteRoles?: Record<string, string[]>;
}

/**
 * Determine whether a set of custom claims grants admin privileges on a given site.
 *
 * Admin privileges mean the user is a super admin, or the current site's role list
 * (`siteRoles[siteId]`) contains any role other than participant. This is site-scoped
 * so a user who is a participant on one site but an admin on another is only treated
 * as an admin on the site they are acting on.
 *
 * @param claims - The flat custom claims object.
 * @param siteId - The site to evaluate the claims against.
 * @returns Whether the user has admin privileges on the given site.
 */
export function isAdminForSite(
  claims: SiteScopedClaims | null | undefined,
  siteId: string | null | undefined,
): boolean {
  if (!claims) return false;
  if (claims.super_admin) return true;
  const siteRoles = (siteId ? claims.siteRoles?.[siteId] : undefined) ?? [];
  return siteRoles.some((role) => role !== ROLES.PARTICIPANT);
}
