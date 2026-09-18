// Firebase callable errors surface as `functions/<code>` while Firestore errors use the bare code,
// so we normalize away the optional `functions/` prefix before matching.
const RETRYABLE_START_ASSESSMENT_CODES = new Set(['internal', 'unavailable', 'deadline-exceeded']);

export function isRetryableStartAssessmentError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = String((error as { code: unknown }).code).replace(/^functions\//, '');
  return RETRYABLE_START_ASSESSMENT_CODES.has(code);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retries `startAssessment` once on transient Firebase errors.
 *
 * `startTask` is effectively idempotent — it runs entirely inside a Firestore transaction and only
 * upserts fields on existing docs (no run/document creation), so a retry never produces duplicates.
 *
 * KNOWN CAVEAT (documented for downstream analysis): the assignment's `startedOn` timestamp is
 * overwritten with `new Date()` on every successful `startTask` call. If the first attempt commits
 * server-side but the client sees a transient error, the retry moves `startedOn` forward by roughly
 * `retryDelayMs`. This is harmless for control flow, but data scientists should treat `startedOn` as
 * "approximately when the task started" rather than an exact first-start time.
 *
 * TODO (follow-up, not in this PR): invert the retry policy so we retry general Firestore/Firebase
 * errors but NOT codes that `startTask` throws explicitly (e.g. unauthenticated, invalid-argument,
 * not-found). Today those explicit failures are re-wrapped as `internal` server-side, so we retry
 * them unnecessarily; distinguishing them requires a server-side change to stop masking them.
 */
export async function startAssessmentWithRetry<T>(startAssessment: () => Promise<T>, retryDelayMs = 1000): Promise<T> {
  try {
    return await startAssessment();
  } catch (error) {
    if (!isRetryableStartAssessmentError(error)) throw error;
    await wait(retryDelayMs);
    return await startAssessment();
  }
}
