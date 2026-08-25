import {
  FirebaseErrorSchema,
  FunctionsErrorSchema,
  type ParsedFirebaseError,
  type ParsedFunctionsError,
  type ZodType,
} from '@levante-framework/levante-zod';
import { FirebaseError } from 'firebase/app';
import { type HttpsCallableResult, httpsCallable } from 'firebase/functions';
import levanteFirebaseConfig from '@/config/firebaseLevante';
import { type EmulatorConfig, type FirebaseConfig, FirebaseService } from '@/firebase/Service';
import firebaseJSON from './../../firebase.json';

export type CallSafeResult<TResult, TError> =
  | { code: 'success'; data: TResult }
  | { code: 'app-error'; data: TError }
  | { code: 'functions-error'; data: ParsedFunctionsError }
  | { code: 'firebase-error'; data: ParsedFirebaseError }
  | { code: 'error'; data: Error };

export class Repository {
  protected constructor(config?: FirebaseConfig, emulatorConfig?: EmulatorConfig) {
    const defaultConfig = levanteFirebaseConfig.admin;
    const defaultEmulatorConfig = firebaseJSON.emulators;
    FirebaseService.initialize(config ?? defaultConfig, emulatorConfig ?? defaultEmulatorConfig);
  }

  protected async call<TData = unknown, TResponse = unknown>(functionName: string, data?: TData): Promise<TResponse> {
    const callable = httpsCallable<TData, TResponse>(FirebaseService.functions, functionName);
    const response: HttpsCallableResult<TResponse> = await callable(data);
    return response?.data;
  }

  protected async callWithTimeout<TData = unknown, TResponse = unknown>(
    functionName: string,
    data: TData | undefined,
    timeoutMs: number,
  ): Promise<TResponse> {
    const callable = httpsCallable<TData, TResponse>(FirebaseService.functions, functionName, {
      timeout: timeoutMs,
    });
    const response: HttpsCallableResult<TResponse> = await callable(data);
    return response?.data;
  }

  protected async callSafe<TParams, TResult, TError>(
    functionName: string,
    params: TParams,
    appErrorSchema: ZodType<TError>,
  ): Promise<CallSafeResult<TResult, TError>> {
    try {
      const req = httpsCallable(FirebaseService.functions, functionName);
      const res = await req(params);

      return { code: 'success', data: res.data as TResult };
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        const appError = appErrorSchema.safeParse(err);
        if (appError.success) return { code: 'app-error', data: appError.data };

        const functionsError = FunctionsErrorSchema.safeParse(err);
        if (functionsError.success) return { code: 'functions-error', data: functionsError.data };

        const firebaseError = FirebaseErrorSchema.safeParse(err);
        if (firebaseError.success) return { code: 'firebase-error', data: firebaseError.data };
      }

      if (err instanceof Error) return { code: 'error', data: err };

      return { code: 'error', data: new Error(`Unexpected ${functionName} error`, { cause: err }) };
    }
  }
}
