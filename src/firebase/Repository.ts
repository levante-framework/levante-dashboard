import { FirebaseService } from '@/firebase/Service';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';

export class Repository {
  protected constructor() {
    FirebaseService.initialize();
  }

  protected async call<TData = unknown, TResponse = unknown>(functionName: string, data?: TData): Promise<TResponse> {
    try {
      const callable = httpsCallable<TData, TResponse>(FirebaseService.functions, functionName);
      const response: HttpsCallableResult<TResponse> = await callable(data);
      return response?.data;
    } catch (error) {
      console.error(`[${functionName}]`, error);
      throw error;
    }
  }
}
