import { type HttpsCallableResult, httpsCallable } from 'firebase/functions';
import levanteFirebaseConfig from '@/config/firebaseLevante';
import { type EmulatorConfig, type FirebaseConfig, FirebaseService } from '@/firebase/Service';
import firebaseJSON from './../../firebase.json';

export abstract class Repository {
  constructor(config?: FirebaseConfig, emulatorConfig?: EmulatorConfig) {
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
}
