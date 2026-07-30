import { type HttpsCallableResult, httpsCallable } from 'firebase/functions';
import levanteFirebaseConfig from '@/config/firebaseLevante';
import { type EmulatorConfig, type FirebaseConfig, FirebaseService } from '@/firebase/Service';
import { logger } from '@/logger';
import firebaseJSON from './../../firebase.json';

export class Repository {
  protected constructor(config?: FirebaseConfig, emulatorConfig?: EmulatorConfig) {
    const defaultConfig = levanteFirebaseConfig.admin;
    const defaultEmulatorConfig = firebaseJSON.emulators;
    FirebaseService.initialize(config ?? defaultConfig, emulatorConfig ?? defaultEmulatorConfig);
  }

  protected async call<TData = unknown, TResponse = unknown>(functionName: string, data?: TData): Promise<TResponse> {
    try {
      const callable = httpsCallable<TData, TResponse>(FirebaseService.functions, functionName);
      const response: HttpsCallableResult<TResponse> = await callable(data);
      return response?.data;
    } catch (error) {
      console.error(`[${functionName}]`, error);
      logger.error(new Error(`Failed to call ${functionName}`, { cause: error }), {
        tags: { function: functionName },
      });
      throw error;
    }
  }

  protected async callWithTimeout<TData = unknown, TResponse = unknown>(
    functionName: string,
    data: TData | undefined,
    timeoutMs: number,
  ): Promise<TResponse> {
    try {
      const callable = httpsCallable<TData, TResponse>(FirebaseService.functions, functionName, {
        timeout: timeoutMs,
      });
      const response: HttpsCallableResult<TResponse> = await callable(data);
      return response?.data;
    } catch (error) {
      console.error(`[${functionName}]`, error);
      logger.error(new Error(`Failed to call ${functionName} with timeout`, { cause: error }), {
        tags: { function: functionName },
      });
      throw error;
    }
  }
}
