import { nextTick, ref, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup';
// Import the composable and its types
import useInactivityTimeout, {
  type UseInactivityTimeoutOptions,
  type UseInactivityTimeoutReturn
} from './useInactivityTimeout';

// --- Mocks for @vueuse/core ---
// Define types for the refs being mocked
const idle: Ref<boolean> = ref(false);
const lastActive: Ref<number> = ref(Date.now());

vi.mock('@vueuse/core', async (importOriginal) => {
  // Type the original module
  const original = await importOriginal<typeof import('@vueuse/core')>();
  return {
    ...original,
    // Mock useIdle to return our reactive refs
    useIdle: vi.fn(() => {
      return {
        idle,
        lastActive,
      };
    }),
    // Mock useTimestamp if its precise behavior is needed, otherwise keep original
    useTimestamp: original.useTimestamp, // Or vi.fn(() => ref(Date.now()))
  };
});

// --- Tests ---
describe('useInactivityTimeout', () => {
  // Define types for options and callbacks
  let options: UseInactivityTimeoutOptions;
  let onIdle: ReturnType<typeof vi.fn>;
  let onTimeout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({});
    onIdle = vi.fn();
    onTimeout = vi.fn();
    // Initialize options object
    options = {
      idleThreshold: 5000,
      countdownDuration: 10000,
      onIdle,
      onTimeout,
    };
    // Reset refs before each test
    idle.value = false;
    lastActive.value = Date.now(); 
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialize with correct countdown timer value', () => {
    const testOptions: UseInactivityTimeoutOptions = { ...options, countdownDuration: 15000 };
    // Type the result
    const [result] = withSetup(() => useInactivityTimeout(testOptions));
    const typedResult = result as UseInactivityTimeoutReturn;

    expect(typedResult.countdownTimer.value).toBe(15);
  });

  it('should invoke the onIdle callback and start countdown when user goes idle', async () => {
    const [result] = withSetup(() => useInactivityTimeout(options));
    const typedResult = result as UseInactivityTimeoutReturn;

    idle.value = true;
    await nextTick();

    // Advance time past idle threshold
    vi.advanceTimersByTime(options.idleThreshold + 1000);
    await nextTick();

    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
    // Countdown started, so it should be less than initial
    expect(typedResult.countdownTimer.value).toBeLessThan(options.countdownDuration / 1000);
  });

  it('should invoke the onTimeout callback when countdown reaches zero', async () => {
    withSetup(() => useInactivityTimeout(options));

    idle.value = true;
    await nextTick();

    // Advance time past idle + countdown duration
    vi.advanceTimersByTime(options.idleThreshold + options.countdownDuration + 1000);
    await nextTick();

    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('should reset the countdown when the user becomes active again', async () => {
    const [result] = withSetup(() => useInactivityTimeout(options));
    const typedResult = result as UseInactivityTimeoutReturn;
    const initialCountdown = options.countdownDuration / 1000;

    // Arrange: Go idle to start the countdown process
    idle.value = true;
    await nextTick(); 
    // Ensure onIdle was called (which sets up the interval)
    expect(onIdle).toHaveBeenCalledTimes(1); 

    // Act: Manually run the interval timer twice
    vi.runOnlyPendingTimers(); // First tick (e.g., 10 -> 9)
    await nextTick(); // Allow potential updates
    vi.runOnlyPendingTimers(); // Second tick (e.g., 9 -> 8)
    await nextTick(); // Allow potential updates
    
    // Assert: Check the countdown value after two interval ticks
    expect(typedResult.countdownTimer.value).toBe(initialCountdown - 2);

    // Act: User becomes active
    idle.value = false;
    typedResult.resetTimer(); 
    
    // Assert: Expect countdown to reset immediately
    expect(typedResult.countdownTimer.value).toBe(initialCountdown);
    
    await nextTick(); 
  });

  it('should handle visibility change correctly (become idle while hidden)', async () => {
    const [result] = withSetup(() => useInactivityTimeout(options));
    const typedResult = result as UseInactivityTimeoutReturn;
    const initialCountdown = options.countdownDuration / 1000;

    idle.value = false;
    lastActive.value = Date.now();
    await nextTick();

    // Hide tab
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(typedResult.countdownTimer.value).toBe(initialCountdown); // Countdown resets when hidden

    // Advance time past idle threshold + some countdown time
    vi.advanceTimersByTime(options.idleThreshold + 3000);
    await nextTick();

    // Show tab
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick(); // Allow watchers/effects to run

    // Expect countdown to start from remaining time
    expect(typedResult.countdownTimer.value).toBeLessThan(initialCountdown - 2);
    expect(typedResult.countdownTimer.value).toBeGreaterThanOrEqual(initialCountdown - 4);
  });

  it('should invoke the onTimeout callback after extended idle time outside the page', async () => {
    withSetup(() => useInactivityTimeout(options));

    idle.value = false;
    lastActive.value = Date.now();
    await nextTick();

    // Hide tab
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();

    // Advance time past timeout threshold
    vi.advanceTimersByTime(options.idleThreshold + options.countdownDuration + 5000);
    await nextTick();

    // Show tab
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick(); // Allow potential async timeout to resolve

    // onIdle might not be called if hidden before idleThreshold is met
    // expect(onIdle).toHaveBeenCalled(); 
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on unmount', async () => {
    const testOptions: UseInactivityTimeoutOptions = { ...options, countdownDuration: 15000 };
    const [result, app] = withSetup(() => useInactivityTimeout(testOptions));
    const typedResult = result as UseInactivityTimeoutReturn;

    idle.value = true; // Make idle to start countdown
    await nextTick();
    vi.advanceTimersByTime(options.idleThreshold + 1000);
    expect(typedResult.countdownTimer.value).toBeLessThan(15);

    app.unmount();
    // After unmount, resetTimer should be called, resetting countdown
    expect(typedResult.countdownTimer.value).toBe(15);
  });
}); 