import { Repository } from '@/firebase/Repository';
import type {
  CreateTaskVariantParams,
  CreateTaskVariantResult,
  GetTasksParams,
  GetTasksResult,
  GetTaskVariantRevisionsParams,
  GetTaskVariantRevisionsResult,
  GetTaskVariantsParams,
  GetTaskVariantsResult,
  GetVariantParamSpecsParams,
  GetVariantParamSpecsResult,
  SerializedTask,
  SerializedTaskVariant,
  SerializedTaskVariantRevision,
  SerializedVariantParamSpec,
  UpdateTaskVariantParams,
  UpdateTaskVariantResult,
  UpsertTaskParams,
  UpsertTaskResult,
  UpsertVariantParamSpecParams,
  UpsertVariantParamSpecResult,
} from '@/types/taskCatalog';

class TasksRepository extends Repository {
  constructor() {
    super();
  }

  async getTasks(params: GetTasksParams = {}): Promise<SerializedTask[]> {
    const response = await this.call<GetTasksParams, GetTasksResult>('getTasks', params);
    return response?.tasks ?? [];
  }

  async getTaskVariants(params: GetTaskVariantsParams = {}): Promise<SerializedTaskVariant[]> {
    const response = await this.call<GetTaskVariantsParams, GetTaskVariantsResult>('getTaskVariants', params);
    return response?.variants ?? [];
  }

  async getTaskVariantRevisions(variantId: string): Promise<SerializedTaskVariantRevision[]> {
    const response = await this.call<GetTaskVariantRevisionsParams, GetTaskVariantRevisionsResult>(
      'getTaskVariantRevisions',
      { variantId },
    );
    return response?.revisions ?? [];
  }

  async getVariantParamSpecs(params: GetVariantParamSpecsParams = {}): Promise<SerializedVariantParamSpec[]> {
    const response = await this.call<GetVariantParamSpecsParams, GetVariantParamSpecsResult>(
      'getVariantParamSpecs',
      params,
    );
    return response?.variantParamSpecs ?? [];
  }

  async upsertTask(params: UpsertTaskParams): Promise<UpsertTaskResult> {
    return await this.call<UpsertTaskParams, UpsertTaskResult>('upsertTask', params);
  }

  async upsertVariantParamSpec(params: UpsertVariantParamSpecParams): Promise<UpsertVariantParamSpecResult> {
    return await this.call<UpsertVariantParamSpecParams, UpsertVariantParamSpecResult>(
      'upsertVariantParamSpec',
      params,
    );
  }

  async createTaskVariant(params: CreateTaskVariantParams): Promise<CreateTaskVariantResult> {
    return await this.call<CreateTaskVariantParams, CreateTaskVariantResult>('createTaskVariant', params);
  }

  async updateTaskVariant(params: UpdateTaskVariantParams): Promise<UpdateTaskVariantResult> {
    return await this.call<UpdateTaskVariantParams, UpdateTaskVariantResult>('updateTaskVariant', params);
  }
}

export const tasksRepository = new TasksRepository();
