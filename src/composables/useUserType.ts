import { computed, type Ref, type ComputedRef } from 'vue';
import { AUTH_USER_TYPE } from '@/constants/auth';
import _isEmpty from 'lodash/isEmpty';
import { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery'; // Import shared type

/**
 * Get user type
 *
 * Composable function to determine the user type based on the user claims. The user type can be either an admin or a
 * participant. The user type is determined based on the user claims, where a user is considered an admin if they have
 * the corresponding super_admin or miniamlAdminOrgs claims.
 *
 * @param {Ref<UserClaimsData | null | undefined>} userClaims - The reactive user claims object (can be null or undefined).
 * @returns {{ userType: ComputedRef<string | undefined>, isAdmin: ComputedRef<boolean>, isParticipant: ComputedRef<boolean>, isSuperAdmin: ComputedRef<boolean> }} The user type and related computed properties.
 */
export default function useUserType(userClaims: Ref<UserClaimsData | null | undefined>): {
  userType: ComputedRef<string | undefined>;
  isAdmin: ComputedRef<boolean>;
  isParticipant: ComputedRef<boolean>;
  isSuperAdmin: ComputedRef<boolean>;
} {
  const userType: ComputedRef<string | undefined> = computed(() => {
    // Check for null or undefined claims value
    if (!userClaims.value) return undefined;

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
