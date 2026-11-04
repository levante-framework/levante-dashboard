import { computed, toValue } from 'vue';
import { AUTH_USER_TYPE } from '@/constants/auth';
import { ROLES } from '@/constants/roles';

/**
 * Determine whether a set of custom claims grants admin privileges on a given site.
 *
 * Admin privileges mean the user is a super admin, or the current site's role list
 * (`siteRoles[siteId]`) contains any role other than participant. This is site-scoped
 * so a user who is a participant on one site but an admin on another is only treated
 * as an admin on the site they are acting on.
 *
 * @param {Object|null} claims - The flat custom claims object.
 * @param {String|null|undefined} siteId - The site to evaluate the claims against.
 * @returns {Boolean} Whether the user has admin privileges on the given site.
 */
export function isAdminForSite(claims, siteId) {
  if (!claims) return false;
  if (claims.super_admin) return true;
  const siteRoles = claims.siteRoles?.[siteId] ?? [];
  return siteRoles.some((role) => role !== ROLES.PARTICIPANT);
}

/**
 * Get user type
 *
 * Composable function to determine the user type based on the user's custom claims and the
 * current site. The user type can be a super admin, an admin, or a participant. A user is a
 * super admin when the `super_admin` claim is true, an admin when they hold a non-participant
 * role on the current site, and a participant otherwise.
 *
 * @param {Object} userClaims - A ref/computed of the flat custom claims object.
 * @param {Object} currentSite - A ref/computed of the current site ID.
 * @returns {Object} The user type and related computed properties.
 */
export default function useUserType(userClaims, currentSite) {
  const userType = computed(() => {
    // Abort the user type determination if the user claims are not available yet.
    const claims = toValue(userClaims);
    if (!claims) return;

    // Check if the user is a super admin.
    if (claims.super_admin) {
      return AUTH_USER_TYPE.SUPER_ADMIN;
    }

    // Check if the user holds a non-participant role on the current site.
    if (isAdminForSite(claims, toValue(currentSite))) {
      return AUTH_USER_TYPE.ADMIN;
    }

    // Otherwise, default to participant user type.
    return AUTH_USER_TYPE.PARTICIPANT;
  });

  const isAdmin = computed(() => userType.value === AUTH_USER_TYPE.ADMIN);
  const isParticipant = computed(() => userType.value === AUTH_USER_TYPE.PARTICIPANT);
  const isSuperAdmin = computed(() => userType.value === AUTH_USER_TYPE.SUPER_ADMIN);

  return {
    userType,
    isAdmin,
    isParticipant,
    isSuperAdmin,
  };
}
