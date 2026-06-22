export type ParamDefinitionType = {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  description: string;
};

export interface ParamDefinitions {
  [key: string]: ParamDefinitionType;
}

export interface TaskSchemaResultItem {
  schemaId: string;
  version: number;
  paramDefinitions: ParamDefinitions;
  createdAt?: unknown;
  createdBy?: string;
}

export interface TaskSchema {
  taskId: string;
  paramDefinitions: ParamDefinitions;
  version: number;
  createdAt?: unknown;
  createdBy?: string;
}

export interface TaskSchemaMap {
  [taskId: string]: TaskSchema;
}
