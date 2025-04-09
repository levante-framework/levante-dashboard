import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { useIdle, useTimestamp, type UseIdleOptions } from '@vueuse/core';
import { useThrottleFn } from '@vueuse/core';

/**
 * Inactivity timeout composable.
 *
 * @param {InactivityTimeoutOptions} options – The options object.
 * @returns {InactivityTimeoutReturn} Object containing the countdown timer and reset function.
 */
interface InactivityTimeoutOptions {
  idleThreshold: number; // in milliseconds
  countdownDuration: number; // in milliseconds
  onIdle: () => void | Promise<void>; // Callback function
  onTimeout: () => void | Promise<void>; // Callback function
}

interface InactivityTimeoutReturn {
  countdownTimer: Ref<number>; // in seconds
  resetTimer: () => void;
}

export default function useInactivityTimeout({
  idleThreshold,
  countdownDuration,
  onIdle,
  onTimeout,
}: InactivityTimeoutOptions): InactivityTimeoutReturn {
  const timeoutThreshold: number = Math.max(0, Math.floor(Number(idleThreshold) + Number(countdownDuration)));

  const isTabActive: Ref<boolean> = ref(true);
  const lastActiveInternal: Ref<number | null> = ref(null);

  const countdownTimer: Ref<number> = ref(Math.floor(countdownDuration / 1000));
  const isCountdownTimerActive: Ref<boolean> = ref(false);

  const idleOptions: UseIdleOptions = { listenForVisibilityChange: false };
  const { idle, lastActive } = useIdle(idleThreshold, idleOptions);
  const now: Ref<number> = useTimestamp({ interval: 1000 });

  let countdownIntervalTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Timeout handler.
   *
   * @returns {Promise<void>}
   */
  const timeout = async (): Promise<void> => {
    await onTimeout();
    resetTimer();
  };

  /**
   * Handle the document visibility change event.
   *
   * When users switch tabs or minimize the window, the document visibility change event is triggered. We use this event
   * as browsers tend to both throttle and/or pause JavaScript execution when the tab is not in focus. This event allows
   * us to store the last active timestamp and the current timestamp in sessionStroage, in order to determine the true
   * idle time when the user returns to the tab.
   *
   * Whilst the useIdle composable technically handles this, it does not work as expected as when the user returns to
   * the tab, the idle timer is immediately reset, making it impossible to determine the true idle time. That's why we
   * initialise useIdle with the option listenForVisibilityChange set to false and handle the visibility change event
   * manually in this function.
   *
   * @returns {void}
   */
  const handleVisibilityChange = (): void => {
    if (document.hidden) {
      isTabActive.value = false;

      // When the user leaves the tab, reset the countdown timer to prevent it from unessarily continuing in the
      // background, likely with a throttled timer imposed by the browser.
      resetCountdown();
    } else {
      isTabActive.value = true;

      if (!lastActiveInternal.value) return;

      const elapsedTimeSinceLastActive = Date.now() - lastActiveInternal.value;

      // If the user was away for longer than the timeout threshold, call the timeout handler.
      if (elapsedTimeSinceLastActive >= timeoutThreshold) {
        timeout();
        return;
      }

      // If the user was away for longer than the idle threshold but less than the timeout threshold, determine the
      // remaining time left for the countdown and start it at the remaining time.
      if (elapsedTimeSinceLastActive >= idleThreshold) {
        const remainingTime = timeoutThreshold - elapsedTimeSinceLastActive;
        countdownTimer.value = Math.floor(Math.max(remainingTime, 0) / 1000);
        startCountdown();
        return;
      }

      // If the user was away for less than the session timeout threshold, set the idle state and last active timestamp
      // accordingly to resume the idle timer based on the actual idle time.
      lastActive.value = lastActiveInternal.value;
      idle.value = false;
    }
  };

  /**
   * Start the countdown timer.
   *
   * Once the user is considered idle, a countdown timer is started to count down the remaining time before the user
   * sessions times out. This function is called when the user goes idle as well as when they return to the tab, hence,
   * to prevent multiple countdown timers from being started, the countdown is only started if no active timer exists.
   * Additionally, the countdown timer is only started when the tab is active to prevent the @vueuse/core useIdle
   * composable from resetting the idle state when the user is away from the tab.
   *
   * @returns {void}
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
   * Reset the sign-out countdown timer.
   *
   * @param {Boolean} resetToOriginalValue – Whether to reset the countdown to the original value or not.
   * @returns {void}
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
   * Idle state reset
   *
   * Reset the idle state and the internal last active timestamp.
   *
   * @returns {void}
   */
  const resetIdleState = (): void => {
    const nowTimestamp = now.value;
    lastActiveInternal.value = nowTimestamp;
    lastActive.value = nowTimestamp;
    idle.value = false;
  };

  /**
   * Full timer reset.
   *
   * Reset the idle state and countdown timer. This function is intended to be called when the component is mounted and
   * unmounted to ensure the idle state is correctly set, as well as when the user manually resets the timer by i.e.
   * clicking a "stay logged in" button.
   */
  const resetTimer = (): void => {
    resetCountdown();
    resetIdleState();
  };

  /**
   * Idle state watcher.
   *
   * Starts the countdown timer when the user goes idle.
   *
   * @param {Boolean} idle - The idle state as provided by the useIdle composable.
   * @returns {void}
   */
  watch(idle, (isIdle: boolean): void => {
    if (isIdle) {
      startCountdown();
    }
  });

  /**
   * Last active timestamp watcher.
   *
   * When the user is not idle and the countdown timer is not active, store the last active timestamp.
   * Important: whilst @vueuse/core useIdle composable exposes the lastActive timestamp, it does not work as expected in
   * our usecase as we don't want to consider a user active when the countdown timer is running. That's why we store the
   * last active timestamp in a separate variable and only update it under specific conditions.
   *
   * @param {Date} lastActive - The last active timestamp as provided by the useIdle composable.
   * @returns {void}
   */
  watch(
    lastActive,
    useThrottleFn(() => {
      if (!isCountdownTimerActive.value) {
        lastActiveInternal.value = lastActive.value;
      }
    }, 1000),
  );

  onMounted(() => {
    resetTimer();
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
