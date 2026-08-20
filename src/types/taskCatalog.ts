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
  SerializedTaskVariantRevision,
  SerializedVariantParamSpec,
  UpdateTaskVariantParams,
  UpdateTaskVariantResult,
  UpsertTaskParams,
  UpsertTaskResult,
  UpsertVariantParamSpecParams,
  UpsertVariantParamSpecResult,
  SerializedTaskVariant as ZodSerializedTaskVariant,
} from '@levante-framework/levante-zod';

export type SerializedTaskVariant = ZodSerializedTaskVariant & {
  displayName?: string;
};

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
