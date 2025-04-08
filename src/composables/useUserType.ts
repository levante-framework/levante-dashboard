import { computed, type Ref, type ComputedRef } from 'vue';
import { AUTH_USER_TYPE } from '@/constants/auth';
import _isEmpty from 'lodash/isEmpty';

// Define the expected structure for the claims
interface Claims {
  super_admin?: boolean;
  minimalAdminOrgs?: Record<string, string[]>;
}

interface UserClaimsData {
  claims?: Claims;
}

/**
 * Get user type
 *
 * Composable function to determine the user type based on the user claims. The user type can be either an admin or a
 * participant. The user type is determined based on the user claims, where a user is considered an admin if they have
 * the corresponding super_admin or miniamlAdminOrgs claims.
 *
 * @param {Ref<UserClaimsData | null>} userClaims - The reactive user claims object.
 * @returns {{ userType: ComputedRef<string | undefined>, isAdmin: ComputedRef<boolean>, isParticipant: ComputedRef<boolean>, isSuperAdmin: ComputedRef<boolean> }} The user type and related computed properties.
 */
export default function useUserType(userClaims: Ref<UserClaimsData | null>): {
  userType: ComputedRef<string | undefined>;
  isAdmin: ComputedRef<boolean>;
  isParticipant: ComputedRef<boolean>;
  isSuperAdmin: ComputedRef<boolean>;
} {
  const userType: ComputedRef<string | undefined> = computed(() => {
    // Abort the user type determination if the user claims are not available yet.
    if (!userClaims.value) return undefined; // Return undefined if claims are null/undefined

    const claims = userClaims.value.claims;

    // Check if the user is a super admin.
    if (claims?.super_admin) {
      return AUTH_USER_TYPE.SUPER_ADMIN;
    }

    // Check if the user has any minimal admin organizations.
    const minimalAdminOrgs = claims?.minimalAdminOrgs ?? {}; // Use nullish coalescing
    const hasMinimalAdminOrgs = Object.values(minimalAdminOrgs).some((org) => !_isEmpty(org));

    if (hasMinimalAdminOrgs) {
      return AUTH_USER_TYPE.ADMIN;
    }

    // Otherwise, default to participant user type.
    return AUTH_USER_TYPE.PARTICIPANT;
  });

  const isAdmin: ComputedRef<boolean> = computed(() => userType.value === AUTH_USER_TYPE.ADMIN);
  const isParticipant: ComputedRef<boolean> = computed(() => userType.value === AUTH_USER_TYPE.PARTICIPANT);
  const isSuperAdmin: ComputedRef<boolean> = computed(() => userType.value === AUTH_USER_TYPE.SUPER_ADMIN);

  return {
    userType,
    isAdmin,
    isParticipant,
    isSuperAdmin,
  };
}
