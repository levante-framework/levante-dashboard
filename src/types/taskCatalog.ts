export type VariantParamValue = boolean | number | string;

export interface SerializedTask {
  id: string;
  archived: boolean;
  createdAt: string;
  createdBy?: string;
  description: string;
  image: string;
  name: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface SerializedTaskVariant {
  id: string;
  taskId: string;
  archived: boolean;
  createdAt: string;
  createdBy?: string;
  name: string;
  params: Record<string, VariantParamValue>;
  registered: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface SerializedVariantParamSpec {
  id: string;
  archived: boolean;
  createdAt: string;
  createdBy: string;
  description: string;
  name: string;
  type: 'boolean' | 'number' | 'string' | 'unknown';
  updatedAt: string;
  updatedBy: string;
}

export interface GetTasksParams {
  archived?: boolean;
}

export interface GetTasksResult {
  tasks: SerializedTask[];
}

export interface GetTaskVariantsParams {
  archived?: boolean;
  registered?: boolean;
  taskId?: string;
  variantIds?: string[];
}

export interface GetTaskVariantsResult {
  variants: SerializedTaskVariant[];
}

export interface GetVariantParamSpecsParams {
  archived?: boolean;
}

export interface GetVariantParamSpecsResult {
  variantParamSpecs: SerializedVariantParamSpec[];
}

export interface UpsertTaskParams {
  archived: boolean;
  description: string;
  image: string;
  name: string;
  id?: string;
}

export interface UpsertTaskResult {
  task: SerializedTask;
}

export interface UpsertVariantParamSpecParams {
  archived: boolean;
  description: string;
  name: string;
  type: 'boolean' | 'number' | 'string' | 'unknown';
  id?: string;
}

export interface UpsertVariantParamSpecResult {
  variantParamSpec: SerializedVariantParamSpec;
}

export interface CreateTaskVariantParams {
  name: string;
  params: Record<string, VariantParamValue>;
  registered: boolean;
  taskId: string;
}

export interface CreateTaskVariantResult {
  variant: SerializedTaskVariant;
}

export interface UpdateTaskVariantParams {
  id: string;
  archived: boolean;
  registered: boolean;
}

export interface UpdateTaskVariantResult {
  variant: SerializedTaskVariant;
}

export interface VariantParamDiff {
  added: Record<string, VariantParamValue>;
  removed: Record<string, VariantParamValue>;
  changed: Record<string, { from: VariantParamValue; to: VariantParamValue }>;
}
