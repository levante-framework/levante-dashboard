import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { useIdle, useTimestamp, useThrottleFn } from '@vueuse/core';

// --- Interfaces ---

export interface UseInactivityTimeoutOptions {
  idleThreshold: number;
  countdownDuration: number;
  onIdle: () => void;
  onTimeout: () => Promise<void> | void; // Allow sync or async timeout handler
}

export interface UseInactivityTimeoutReturn {
  countdownTimer: Ref<number>;
  resetTimer: () => void;
}

/**
 * Inactivity timeout composable.
 *
 * @param {UseInactivityTimeoutOptions} options – The options object.
 * @returns {UseInactivityTimeoutReturn} Object containing the countdown timer and reset function.
 */
export default function useInactivityTimeout({
  idleThreshold,
  countdownDuration,
  onIdle,
  onTimeout,
}: UseInactivityTimeoutOptions): UseInactivityTimeoutReturn {
  const timeoutThreshold: number = Math.max(0, Math.floor(Number(idleThreshold) + Number(countdownDuration)));

  const isTabActive: Ref<boolean> = ref(true);
  // lastActiveInternal stores a timestamp (number) or null initially
  const lastActiveInternal: Ref<number | null> = ref(null);

  const countdownTimer: Ref<number> = ref(Math.floor(countdownDuration / 1000));
  const isCountdownTimerActive: Ref<boolean> = ref(false);

  const { idle, lastActive } = useIdle(idleThreshold, { listenForVisibilityChange: false });
  const now = useTimestamp({ interval: 1000 });

  // Type the interval timer handle
  let countdownIntervalTimer: NodeJS.Timeout | null = null;

  /**
   * Timeout handler.
   *
   * @returns {Promise<void>}
   */
  const timeout = async (): Promise<void> => {
    await onTimeout();
    resetTimer(); // resetTimer is defined later, ensure correct scope or hoist if needed
  };

  const handleVisibilityChange = (): void => {
    if (document.hidden) {
      isTabActive.value = false;
      resetCountdown();
    } else {
      isTabActive.value = true;

      if (lastActiveInternal.value === null) return;

      const elapsedTimeSinceLastActive = Date.now() - lastActiveInternal.value;

      if (elapsedTimeSinceLastActive >= timeoutThreshold) {
        timeout(); // Call timeout handler
        return;
      }

      if (elapsedTimeSinceLastActive >= idleThreshold) {
        const remainingTime = timeoutThreshold - elapsedTimeSinceLastActive;
        countdownTimer.value = Math.floor(Math.max(remainingTime, 0) / 1000);
        startCountdown(); // Call startCountdown
        return;
      }

      // Here, lastActiveInternal.value is guaranteed to be a number
      lastActive.value = lastActiveInternal.value;
      idle.value = false;
    }
  };

  /**
   * Reset the sign-out countdown timer.
   *
   * @param {boolean} [resetToOriginalValue=true] – Whether to reset the countdown to the original value or not.
   */
  const resetCountdown = (resetToOriginalValue: boolean = true): void => {
    isCountdownTimerActive.value = false;

    if (countdownIntervalTimer) {
      clearInterval(countdownIntervalTimer);
    }
    countdownIntervalTimer = null;

    countdownTimer.value = resetToOriginalValue ? Math.floor(countdownDuration / 1000) : 0;
  };

  /**
   * Start the countdown timer.
   */
  const startCountdown = (): void => {
    if (isCountdownTimerActive.value || !isTabActive.value) return;

    isCountdownTimerActive.value = true;

    onIdle();

    countdownIntervalTimer = setInterval(async () => {
      countdownTimer.value -= 1;

      if (countdownTimer.value <= 0) {
        // Pass false to resetCountdown as we are timing out, not resetting due to activity
        resetCountdown(false); 
        await timeout();
      }
    }, 1000);
  };

  /**
   * Idle state reset
   */
  const resetIdleState = (): void => {
    const nowTimestamp = now.value;
    lastActiveInternal.value = nowTimestamp;
    lastActive.value = nowTimestamp;
    idle.value = false;
  };

  /**
   * Full timer reset.
   */
  const resetTimer = (): void => {
    resetCountdown();
    resetIdleState();
  };

  /**
   * Idle state watcher.
   */
  watch(idle, (isCurrentlyIdle: boolean) => {
    if (isCurrentlyIdle) {
      startCountdown();
    }
  });

  /**
   * Last active timestamp watcher.
   */
  watch(
    lastActive,
    useThrottleFn(() => {
      // Only update internal timestamp if not counting down
      if (!isCountdownTimerActive.value) {
        lastActiveInternal.value = lastActive.value;
      }
    }, 1000),
  );

  onMounted(() => {
    resetTimer();
    // Initialize internal timestamp on mount
    lastActiveInternal.value = lastActive.value; 
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    resetTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    countdownTimer,
    resetTimer,
  };
} 