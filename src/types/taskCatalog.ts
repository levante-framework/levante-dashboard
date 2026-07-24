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
} from '@levante-framework/levante-zod';

export type {
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
};

export type VariantParamValue = boolean | number | string;

export interface VariantParamDiff {
  added: Record<string, VariantParamValue>;
  removed: Record<string, VariantParamValue>;
  changed: Record<string, { from: VariantParamValue; to: VariantParamValue }>;
}
