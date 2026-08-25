import {
  FirebaseErrorSchema,
  FunctionsErrorSchema,
  type ParsedFirebaseError,
  type ParsedFunctionsError,
  type ZodType,
} from '@levante-framework/levante-zod';
import { FirebaseError } from 'firebase/app';

export type FirebaseCallFailure<TError> =
  | { code: 'app-error'; error: TError }
  | { code: 'functions-error'; error: ParsedFunctionsError }
  | { code: 'firebase-error'; error: ParsedFirebaseError }
  | { code: 'error'; error: Error };

export function toFirebaseCallFailure<TError>(
  err: unknown,
  appErrorSchema: ZodType<TError>,
): FirebaseCallFailure<TError> {
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
    error: new Error(`Unexpected Firebase call failure`, { cause: err }),
  };
}
