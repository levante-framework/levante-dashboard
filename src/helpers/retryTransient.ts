const RETRYABLE_CODES = new Set([
  'internal',
  'unavailable',
  'deadline-exceeded',
  'network-request-failed',
  'cancelled',
]);

const NON_RETRYABLE_CODES = new Set([
  'permission-denied',
  'unauthenticated',
  'not-found',
  'invalid-argument',
  'failed-precondition',
  'already-exists',
  'aborted',
]);

const TRANSIENT_MESSAGE =
  /failed to fetch|client is offline|network error|network request failed|load failed|timeout|timed out/i;

function errorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return String((error as { code: unknown }).code).replace(/^(functions|auth)\//, '');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String((error as { message: unknown }).message);
  return '';
}

export function isTransientError(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  ) {
    return false;
  }
  const code = errorCode(error);
  if (code && NON_RETRYABLE_CODES.has(code)) return false;
  if (code && RETRYABLE_CODES.has(code)) return true;
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number((error as { status: unknown }).status);
    if (status === 0 || status >= 500) return true;
    if (status >= 400) return false;
  }
  if (error instanceof TypeError) return true;
  return TRANSIENT_MESSAGE.test(errorMessage(error));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryTransient<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    beforeRetry?: (error: unknown) => Promise<void>;
  } = {},
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt === attempts - 1) throw error;
      if (options.beforeRetry) await options.beforeRetry(error);
      await wait(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}
