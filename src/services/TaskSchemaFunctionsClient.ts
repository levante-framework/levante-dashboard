import type { ParamDefinitions, TaskSchema, TaskSchemaResultItem } from '@/types/taskSchema';
import { FirebaseFunctionsClient } from './FirebaseFunctionsClient';

interface GetTaskSchemasPayload {
  taskId: string;
  siteId: string;
}

type GetTaskSchemasResponse = TaskSchemaResultItem[];

interface UpsertTaskSchemaPayload {
  taskId: string;
  siteId: string;
  paramDefinitions: ParamDefinitions;
}

interface UpsertTaskSchemaResult {
  version: number;
  taskSchema?: TaskSchema;
}

function pickLatestSchema(result: TaskSchemaResultItem[]): TaskSchemaResultItem | null {
  if (!result?.length) return null;
  const first = result[0] as TaskSchemaResultItem;
  return result.reduce<TaskSchemaResultItem>(
    (latest, item) => (item.version > latest.version ? item : latest),
    first,
  );
}

export class TaskSchemaFunctionsClient extends FirebaseFunctionsClient {
  getTaskSchemas(taskId: string, siteId: string): Promise<TaskSchemaResultItem | null> {
    return this
      .call<GetTaskSchemasPayload, GetTaskSchemasResponse>('getTaskSchemas', { taskId, siteId })
      .then((res) => {
        const result = res.data ?? [];
        const picked = pickLatestSchema(result);
        return picked ?? null;
      });
  }

  upsertTaskSchema(payload: UpsertTaskSchemaPayload): Promise<UpsertTaskSchemaResult | undefined> {
    return this.call<UpsertTaskSchemaPayload, UpsertTaskSchemaResult>('upsertTaskSchema', payload).then(
      (res) => res.data,
    );
  }
}

export const taskSchemaFunctionsClient = new TaskSchemaFunctionsClient();
