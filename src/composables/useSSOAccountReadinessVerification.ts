import { ref, onUnmounted, Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, Router } from 'vue-router';
import { useQueryClient, QueryClient } from '@tanstack/vue-query';
import { StatusCodes } from 'http-status-codes';
import { useAuthStore } from '@/store/auth.js';
import useUserDataQuery from '@/composables/queries/useUserDataQuery'; // Assuming .ts
import { AUTH_USER_TYPE } from '@/constants/auth';
import { APP_ROUTES } from '@/constants/routes';

const POLLING_INTERVAL: number = 600;

// Define UserData structure (match useUpdateUserMutation or import)
interface UserData {
  userType?: string; // Key field used in this composable
  [key: string]: any;
}

// Define the return structure of the composable
interface SSOReadinessReturn {
  retryCount: Ref<number>;
  startPolling: () => void;
}

/**
 * Verify account readiness after SSO authentication.
 *
 * Polls the user document until it is ready for use and then redirects the user to the home page.
 *
 * @TODO: Implement a MAX_RETRY_COUNT to prevent infinite polling.
 * @TODO: Consider refactoring to use realtime updates instead of polling.
 */
const useSSOAccountReadinessVerification = (): SSOReadinessReturn => {
  const retryCount: Ref<number> = ref(1);
  // Use NodeJS.Timeout type for setInterval return value
  let userDataCheckInterval: NodeJS.Timeout | null = null;

  const router: Router = useRouter();
  const queryClient: QueryClient = useQueryClient();

  const authStore = useAuthStore();
  const { roarUid }: { roarUid: Ref<string | undefined> } = storeToRefs(authStore);

  // Assuming useUserDataQuery returns typed data
  const { data: userData, refetch: refetchUserData, isFetchedAfterMount } = useUserDataQuery();

  /**
   * Verifies account readiness by checking userType.
   */
  const verifyAccountReadiness = async (): Promise<void> => {
    try {
      if (isFetchedAfterMount.value) {
        await refetchUserData();
      }

      // Assuming userData.value structure matches UserData interface
      const userType = (userData.value as UserData | undefined)?.userType;

      if (!userType) {
        console.log(`[SSO] User type missing for user ${roarUid.value}. Attempt #${retryCount.value}, retrying...`);
        retryCount.value++;
        return;
      }

      if (userType === AUTH_USER_TYPE.GUEST) {
        console.log(
          `[SSO] User ${roarUid.value} identified as ${userType} user. Attempt #${retryCount.value}, retrying...`,
        );
        retryCount.value++;
        return;
      }

      console.log(`[SSO] User ${roarUid.value} successfully identified as ${userType} user. Routing to home page...`);

      // Stop polling if interval is set
      if (userDataCheckInterval) {
        clearInterval(userDataCheckInterval);
        userDataCheckInterval = null; // Clear the reference
      }

      // Invalidate all queries.
      queryClient.invalidateQueries();

      // Redirect to home.
      router.push({ path: APP_ROUTES.HOME });
    } catch (error: any) {
      // Check for specific error status if available
      if (error?.response?.status === StatusCodes.UNAUTHORIZED) {
        console.warn('[SSO] Unauthorized error during readiness check, possibly still processing. Retrying...');
        retryCount.value++;
        return; // Continue polling on 401
      }
      // Otherwise throw unexpected error.
      console.error('[SSO] Unexpected error during readiness check:', error);
      throw error;
    }
  };

  /**
   * Starts polling to check for user readiness.
   */
  const startPolling = (): void => {
    if (userDataCheckInterval) {
        console.warn("[SSO] Polling already started.");
        return;
    }
    console.log("[SSO] Starting polling for account readiness...");
    userDataCheckInterval = setInterval(verifyAccountReadiness, POLLING_INTERVAL);
  };

  /**
   * Stops the polling mechanism.
   */
  const stopPolling = (): void => {
    if (userDataCheckInterval) {
        console.log("[SSO] Stopping polling.");
        clearInterval(userDataCheckInterval);
        userDataCheckInterval = null;
    }
  };

  onUnmounted(() => {
    stopPolling();
  });

  return {
    retryCount,
    startPolling,
  };
};

export default useSSOAccountReadinessVerification; 