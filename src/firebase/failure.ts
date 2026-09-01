import {
  FirebaseErrorSchema,
  FunctionsErrorSchema,
  type ParsedFirebaseError,
  type ParsedFunctionsError,
  type ZodType,
} from '@levante-framework/levante-zod';
import { FirebaseError } from 'firebase/app';

export type FirebaseFailure<TError> =
  | { code: 'app-error'; error: TError }
  | { code: 'functions-error'; error: ParsedFunctionsError }
  | { code: 'firebase-error'; error: ParsedFirebaseError }
  | { code: 'error'; error: Error };

/**
 * Flatten a `FirebaseFailure` into a single `/`-delimited code string
 * (e.g. `app-error/functions/invalid-argument/id-hash-mismatch`), suitable as a
 * stable, low-cardinality identifier for logging/telemetry. Appends nested codes
 * where present: the failure tag, then `error.code`, then `error.details.code`.
 */
export function toFirebaseFailureCode(failure: FirebaseFailure<{ code: string; details?: { code: string } }>): string {
  let code = `${failure.code}`;
  if (failure.code !== 'error') {
    code = `${code}/${failure.error.code}`;
  }
  if (failure.code === 'app-error' && failure.error.details) {
    code = `${code}/${failure.error.details.code}`;
  }
  return code;
}

/**
 * Classify an unknown value thrown by Firebase Functions into a tagged
 * `FirebaseFailure`.
 *
 * If the value is a `FirebaseError` instance, it is matched against these
 * schemas in order, and tagged with the first that succeeds:
 *   - `appErrorSchema` → `app-error`
 *   - `FunctionsErrorSchema` → `functions-error`
 *   - `FirebaseErrorSchema` → `firebase-error`
 * Any other `Error` is tagged `error`. A non-`Error` value is tagged `error`
 * too, wrapped in an `Error` with the original value kept as `cause`.
 */
export function toFirebaseFailure<TError>(err: unknown, appErrorSchema: ZodType<TError>): FirebaseFailure<TError> {
  if (err instanceof FirebaseError) {
    const appError = appErrorSchema.safeParse(err);
    if (appError.success) return { code: 'app-error', error: appError.data };

    const functionsError = FunctionsErrorSchema.safeParse(err);
    if (functionsError.success) return { code: 'functions-error', error: functionsError.data };

    const firebaseError = FirebaseErrorSchema.safeParse(err);
    if (firebaseError.success) return { code: 'firebase-error', error: firebaseError.data };
  }

  if (err instanceof Error) return { code: 'error', error: err };

  return {
    code: 'error',
    error: new Error(`Unexpected Firebase failure`, { cause: err }),
  };
}
