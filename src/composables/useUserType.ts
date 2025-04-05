import { computed, ComputedRef, Ref } from 'vue';
import { AUTH_USER_TYPE } from '@/constants/auth';
import _isEmpty from 'lodash/isEmpty';

// Define the structure expected within userClaims.value.claims
interface ClaimsData {
  super_admin?: boolean;
  minimalAdminOrgs?: Record<string, any[] | undefined>;
  // Add other potential claims properties if known
}

// Define the structure expected for the userClaims ref itself
interface UserClaims {
  claims?: ClaimsData;
  // Add other potential top-level properties if known
}

// Define the return type structure
export interface UserTypeInfo {
  userType: ComputedRef<string | undefined>;
  isAdmin: ComputedRef<boolean>;
  isParticipant: ComputedRef<boolean>;
  isSuperAdmin: ComputedRef<boolean>;
}

/**
 * Get user type
 *
 * Composable function to determine the user type based on the user claims. The user type can be either an admin or a
 * participant. The user type is determined based on the user claims, where a user is considered an admin if they have
 * the corresponding super_admin or miniamlAdminOrgs claims.
 *
 * @param {Ref<UserClaims | undefined | null>} userClaims - The reactive user claims object ref.
 * @returns {UserTypeInfo} The user type and related computed properties.
 */
export default function useUserType(userClaims: Ref<UserClaims | undefined | null>): UserTypeInfo {
  const userType = computed(() => {
    // Abort the user type determination if the user claims are not available yet.
    if (!userClaims.value) return undefined; // Return undefined explicitly

    const claims: ClaimsData | undefined = userClaims.value.claims;

    // Check if the user is a super admin.
    if (claims?.super_admin) {
      return AUTH_USER_TYPE.SUPER_ADMIN;
    }

    // Check if the user has any minimal admin organizations.
    const minimalAdminOrgs: Record<string, any[] | undefined> = claims?.minimalAdminOrgs || {};
    const hasMinimalAdminOrgs = Object.values(minimalAdminOrgs).some((org: any[] | undefined) => !_isEmpty(org));

    if (hasMinimalAdminOrgs) {
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