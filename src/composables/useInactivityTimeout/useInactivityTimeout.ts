import { ref, watch, onMounted, onUnmounted, Ref } from 'vue';
import { useIdle, useTimestamp, UseIdleOptions } from '@vueuse/core';
import { useThrottleFn } from '@vueuse/core';

// Define options interface
interface InactivityTimeoutOptions {
  idleThreshold: number;
  countdownDuration: number;
  onIdle: () => void | Promise<void>;
  onTimeout: () => void | Promise<void>;
}

// Define return type interface
interface InactivityTimeoutReturn {
  countdownTimer: Ref<number>;
  resetTimer: () => void;
}

/**
 * Inactivity timeout composable.
 *
 * @param {InactivityTimeoutOptions} options – The options object.
 * @returns {InactivityTimeoutReturn} Object containing the countdown timer and reset function.
 */
export default function useInactivityTimeout({
  idleThreshold,
  countdownDuration,
  onIdle,
  onTimeout,
}: InactivityTimeoutOptions): InactivityTimeoutReturn {
  const timeoutThreshold: number = Math.max(0, Math.floor(Number(idleThreshold) + Number(countdownDuration)));

  const isTabActive: Ref<boolean> = ref(true);
  // Store timestamp as number (milliseconds since epoch)
  const lastActiveInternal: Ref<number | null> = ref<number | null>(null);

  const countdownTimer: Ref<number> = ref(Math.floor(countdownDuration / 1000));
  const isCountdownTimerActive: Ref<boolean> = ref(false);

  // Specify IdleOptions type
  const idleOptions: UseIdleOptions = { listenForVisibilityChange: false };
  const { idle, lastActive } = useIdle(idleThreshold, idleOptions);
  const now = useTimestamp({ interval: 1000 });

  let countdownIntervalTimer: NodeJS.Timeout | null = null;

  /**
   * Timeout handler.
   */
  const timeout = async (): Promise<void> => {
    await onTimeout();
    resetTimer();
  };

  /**
   * Handle document visibility changes.
   */
  const handleVisibilityChange = (): void => {
    if (document.hidden) {
      isTabActive.value = false;
      resetCountdown();
    } else {
      isTabActive.value = true;

      if (!lastActiveInternal.value) return;

      const elapsedTimeSinceLastActive = Date.now() - lastActiveInternal.value;

      if (elapsedTimeSinceLastActive >= timeoutThreshold) {
        timeout();
        return;
      }

      if (elapsedTimeSinceLastActive >= idleThreshold) {
        const remainingTime = timeoutThreshold - elapsedTimeSinceLastActive;
        countdownTimer.value = Math.floor(Math.max(remainingTime, 0) / 1000);
        startCountdown();
        return;
      }

      // lastActive from useIdle returns a Ref<number>
      lastActive.value = lastActiveInternal.value;
      idle.value = false;
    }
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
        resetCountdown(false);
        await timeout();
      }
    }, 1000);
  };

  /**
   * Reset the countdown timer.
   */
  const resetCountdown = (resetToOriginalValue: boolean = true): void => {
    isCountdownTimerActive.value = false;

    if (countdownIntervalTimer) {
      clearInterval(countdownIntervalTimer);
      countdownIntervalTimer = null;
    }

    countdownTimer.value = resetToOriginalValue ? Math.floor(countdownDuration / 1000) : 0;
  };

  /**
   * Reset the idle state.
   */
  const resetIdleState = (): void => {
    const nowTimestamp = now.value; // now.value is a number
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
   * Watcher for idle state changes.
   */
  watch(idle, (isIdle: boolean) => {
    if (isIdle) {
      startCountdown();
    }
  });

  /**
   * Watcher for last active timestamp changes.
   */
  watch(
    lastActive,
    useThrottleFn(() => {
      // lastActive.value is a number
      if (!isCountdownTimerActive.value) {
        lastActiveInternal.value = lastActive.value;
      }
    }, 1000),
  );

  onMounted(() => {
    resetTimer();
    // Ensure lastActive.value is a number before assigning
    lastActiveInternal.value = typeof lastActive.value === 'number' ? lastActive.value : null;
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