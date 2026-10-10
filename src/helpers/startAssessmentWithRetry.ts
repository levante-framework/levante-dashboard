import { enableNetwork } from 'firebase/firestore';
import { FirebaseService } from '@/firebase/Service';
import { isTransientError, retryTransient } from '@/helpers/retryTransient';

export function isRetryableStartAssessmentError(error: unknown): boolean {
  return isTransientError(error);
}

async function reconnectFirestoreIfOffline(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  const message = error instanceof Error ? error.message : '';
  const isOffline = code.replace(/^functions\//, '') === 'unavailable' || /client is offline/i.test(message);
  if (!isOffline || !FirebaseService.db) return;
  try {
    await enableNetwork(FirebaseService.db);
  } catch {
    // The next startAssessment attempt is the recovery.
  }
}

/**
 * Retries `startAssessment` on transient Firebase and network errors.
 *
 * `startTask` is effectively idempotent — it runs entirely inside a Firestore transaction and only
 * upserts fields on existing docs (no run/document creation), so a retry never produces duplicates.
 *
 * KNOWN CAVEAT (documented for downstream analysis): the assignment's `startedOn` timestamp is
 * overwritten with `new Date()` on every successful `startTask` call. If the first attempt commits
 * server-side but the client sees a transient error, the retry moves `startedOn` forward by roughly
 * the retry delay. This is harmless for control flow, but data scientists should treat `startedOn` as
 * "approximately when the task started" rather than an exact first-start time.
 */
export async function startAssessmentWithRetry<T>(
  startAssessment: () => Promise<T>,
  retryDelayMs = 1000,
  maxAttempts = 4,
): Promise<T> {
  return retryTransient(startAssessment, {
    attempts: maxAttempts,
    baseDelayMs: retryDelayMs,
    beforeRetry: reconnectFirestoreIfOffline,
  });
}
