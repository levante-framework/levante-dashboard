import type { TaskUserType } from '@/types/taskField';

export interface Task {
  id: string;
  name?: string;
  taskName?: string;
  [key: string]: unknown;
}

export interface GetTasksParams {
  siteId: string;
  registered?: boolean;
  taskIds?: string[];
}

export interface GetTasksResponse {
  data: Task[];
}

export interface UpsertTaskPayload {
  name: string;
  id: string;
  description: string;
  image: string;
  registered: true;
  taskUrl: string;
  userTypes: TaskUserType[];
}

export interface TaskVariantPayload {
  [key: string]: unknown;
}

export interface GetVariantsParams {
  siteId: string;
  taskId?: string;
  registeredVariantsOnly?: boolean;
}

export interface VariantSummary {
  id: string;
  taskId: string;
  taskName: string;
  name?: string;
  params?: Record<string, unknown>;
  registered?: boolean;
  schemaVersion?: number;
  lastUpdated?: unknown;
  taskURL?: string;
  variantURL?: string;
  conditions?: unknown;
  [key: string]: unknown;
}

export interface TaskVariantListItem {
  id: string;
  variant: VariantSummary & { id: string };
  task: {
    id: string;
    name?: string;
    [key: string]: unknown;
  };
}
