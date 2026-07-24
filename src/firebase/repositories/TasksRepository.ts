import { Repository } from '@/firebase/Repository';
import type {
  CreateTaskVariantParams,
  CreateTaskVariantResult,
  GetTasksParams,
  GetTasksResult,
  GetTaskVariantsParams,
  GetTaskVariantsResult,
  GetVariantParamSpecsParams,
  GetVariantParamSpecsResult,
  SerializedTask,
  SerializedTaskVariant,
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

  async getVariantParamSpecs(params: GetVariantParamSpecsParams = {}): Promise<SerializedVariantParamSpec[]> {
    const response = await this.call<GetVariantParamSpecsParams, GetVariantParamSpecsResult>(
      'getVariantParamSpecs',
      params,
    );
    return response?.variantParamSpecs ?? [];
  }

  // Phase 2: create/edit/archive tasks
  async upsertTask(params: UpsertTaskParams): Promise<UpsertTaskResult> {
    return await this.call<UpsertTaskParams, UpsertTaskResult>('upsertTask', params);
  }

  // Phase 2: create/edit/archive variant param specs
  async upsertVariantParamSpec(params: UpsertVariantParamSpecParams): Promise<UpsertVariantParamSpecResult> {
    return await this.call<UpsertVariantParamSpecParams, UpsertVariantParamSpecResult>(
      'upsertVariantParamSpec',
      params,
    );
  }

  // Phase 2: create a new variant when params change (params are immutable)
  async createTaskVariant(params: CreateTaskVariantParams): Promise<CreateTaskVariantResult> {
    return await this.call<CreateTaskVariantParams, CreateTaskVariantResult>('createTaskVariant', params);
  }

  // Phase 2: register/deregister only — never send params
  async updateTaskVariant(params: UpdateTaskVariantParams): Promise<UpdateTaskVariantResult> {
    return await this.call<UpdateTaskVariantParams, UpdateTaskVariantResult>('updateTaskVariant', params);
  }
}

export const tasksRepository = new TasksRepository();
