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

export async function startAssessmentWithRetry<T>(startAssessment: () => Promise<T>, retryDelayMs = 1000): Promise<T> {
  try {
    return await startAssessment();
  } catch (error) {
    if (!isRetryableStartAssessmentError(error)) throw error;
    await wait(retryDelayMs);
    return await startAssessment();
  }
}
