import { Repository } from '@/firebase/Repository';
import type {
  GetTasksParams,
  GetTasksResponse,
  GetVariantsParams,
  Task,
  TaskVariantListItem,
  TaskVariantPayload,
  UpsertTaskPayload,
  VariantSummary,
} from '@/types/task';
import type { ParamDefinitions, TaskSchema, TaskSchemaResultItem } from '@/types/taskSchema';

interface GetTaskSchemasPayload {
  taskId: string;
  siteId: string;
}

type GetTaskSchemasResponse = TaskSchemaResultItem[] | { data?: TaskSchemaResultItem[] };

interface UpsertTaskSchemaPayload {
  taskId: string;
  siteId: string;
  paramDefinitions: ParamDefinitions;
}

interface UpsertTaskSchemaResult {
  version: number;
  taskSchema?: TaskSchema;
}

export function pickLatestSchema(result: TaskSchemaResultItem[]): TaskSchemaResultItem | null {
  if (!result?.length) return null;
  const first = result[0] as TaskSchemaResultItem;
  return result.reduce<TaskSchemaResultItem>(
    (latest, item) => (item.version > latest.version ? item : latest),
    first,
  );
}

function normalizeSchemaResults(response: GetTaskSchemasResponse): TaskSchemaResultItem[] {
  if (Array.isArray(response)) return response;
  return response?.data ?? [];
}

function normalizeVariantsResponse(
  response: VariantSummary[] | { data?: VariantSummary[] },
): VariantSummary[] {
  if (Array.isArray(response)) return response;
  return response?.data ?? [];
}

function mapVariantSummaryToListItem(summary: VariantSummary): TaskVariantListItem {
  const { id, taskId, taskName, ...variantFields } = summary;
  return {
    id,
    variant: {
      id,
      taskId,
      taskName,
      ...variantFields,
    },
    task: {
      id: taskId,
      name: taskName,
    },
  };
}

class TasksRepository extends Repository {
  constructor() {
    super();
  }

  async getTasks(params?: GetTasksParams): Promise<Task[]> {
    const response = await this.call<GetTasksParams, GetTasksResponse | Task[]>('getTasks', params);
    if (Array.isArray(response)) return response;
    return response?.data ?? [];
  }

  async upsertTask(payload: UpsertTaskPayload): Promise<unknown> {
    return await this.call<UpsertTaskPayload, unknown>('upsertTask', payload);
  }

  async getTaskSchemaVersions(taskId: string, siteId: string): Promise<TaskSchemaResultItem[]> {
    const response = await this.call<GetTaskSchemasPayload, GetTaskSchemasResponse>('getTaskSchemas', {
      taskId,
      siteId,
    });
    return normalizeSchemaResults(response);
  }

  async getTaskSchemas(taskId: string, siteId: string): Promise<TaskSchemaResultItem | null> {
    const result = await this.getTaskSchemaVersions(taskId, siteId);
    return pickLatestSchema(result);
  }

  async getVariants(params: GetVariantsParams): Promise<TaskVariantListItem[]> {
    const response = await this.call<GetVariantsParams, VariantSummary[] | { data?: VariantSummary[] }>(
      'getVariants',
      params,
    );
    return normalizeVariantsResponse(response).map(mapVariantSummaryToListItem);
  }

  async upsertTaskSchema(payload: UpsertTaskSchemaPayload): Promise<UpsertTaskSchemaResult | undefined> {
    return await this.call<UpsertTaskSchemaPayload, UpsertTaskSchemaResult>('upsertTaskSchema', payload);
  }

  async upsertTaskVariant(variant: TaskVariantPayload): Promise<unknown> {
    return await this.call<TaskVariantPayload, unknown>('upsertTaskVariant', variant);
  }
}

export const tasksRepository = new TasksRepository();
