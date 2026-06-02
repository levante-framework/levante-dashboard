import { FirebaseFunctionsClient } from './FirebaseFunctionsClient';

export interface TaskVariantPayload {
  [key: string]: unknown;
}

export class TaskVariantFunctionsClient extends FirebaseFunctionsClient {
  upsertTaskVariant(variant: TaskVariantPayload) {
    return this.call<TaskVariantPayload, unknown>('upsertTaskVariant', variant);
  }
}

export const taskVariantFunctionsClient = new TaskVariantFunctionsClient();
