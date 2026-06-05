import type { TaskArrayItemType, TaskDynamicField, TaskFieldType, TaskUserType } from '@/types/taskField';
import { TASK_USER_TYPES } from '@/types/taskField';

export const EXPLICIT_TASK_FIELD_KEYS = [
  'taskName',
  'taskURL',
  'registered',
  'userTypes',
  'taskImage',
  'taskDescription',
] as const;

export const TASK_IGNORED_FIELD_KEYS = [
  'id',
  'lastUpdated',
  'gameConfig',
  'parentDoc',
  ...EXPLICIT_TASK_FIELD_KEYS,
] as const;

export const TASK_RESERVED_FIELD_NAMES = ['id', 'taskId', ...EXPLICIT_TASK_FIELD_KEYS] as const;

export function createEmptyTaskData() {
  return {
    taskName: '',
    taskId: '',
    taskURL: '',
    registered: true,
    userTypes: [] as TaskUserType[],
    taskImage: '',
    taskDescription: '',
  };
}

export interface TaskFormData {
  taskName: string;
  taskId: string;
  taskDescription: string;
  taskImage: string;
  taskURL: string;
  userTypes: unknown;
}

export function mapTaskToFormData(task: Record<string, unknown>) {
  return {
    taskName: String(task.name ?? task.taskName ?? ''),
    taskId: String(task.id ?? ''),
    taskURL: String(task.taskUrl ?? task.taskURL ?? ''),
    taskImage: String(task.image ?? task.taskImage ?? ''),
    taskDescription: String(task.description ?? task.taskDescription ?? ''),
    userTypes: normalizeUserTypes(task.userTypes),
    registered: true,
  };
}

export function buildUpsertTaskPayload(formData: TaskFormData) {
  return {
    name: formData.taskName.trim(),
    id: formData.taskId.trim(),
    description: formData.taskDescription.trim(),
    image: formData.taskImage.trim(),
    taskUrl: formData.taskURL.trim(),
    userTypes: normalizeUserTypes(formData.userTypes),
    registered: true as const,
  };
}

export function taskIdExists(tasks: { id: string }[], id: string) {
  const normalizedId = id.trim();
  if (!normalizedId) return false;
  return tasks.some((task) => task.id === normalizedId);
}

export function hasRequiredUserTypes(values: unknown): values is TaskUserType[] {
  return isValidUserTypes(values) && values.length > 0;
}

export function inferArrayItemType(arr: unknown[]): TaskArrayItemType {
  if (!arr.length) return 'string';
  const first = arr[0];
  if (typeof first === 'boolean') return 'boolean';
  if (typeof first === 'number') return 'number';
  return 'string';
}

export function createEmptyDynamicField(type: TaskFieldType = 'string'): TaskDynamicField {
  if (type === 'array') {
    return { name: '', type: 'array', itemType: 'string', value: [] };
  }
  if (type === 'number') {
    return { name: '', type: 'number', value: 0 };
  }
  if (type === 'boolean') {
    return { name: '', type: 'boolean', value: false };
  }
  return { name: '', type: 'string', value: '' };
}

export function getFieldTypePlaceholder(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function isValidUserTypes(values: unknown): values is TaskUserType[] {
  if (!Array.isArray(values)) return false;
  const allowed = new Set<string>(TASK_USER_TYPES);
  const seen = new Set<string>();
  return values.every((value) => {
    if (typeof value !== 'string' || !allowed.has(value) || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function normalizeUserTypes(values: unknown): TaskUserType[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set<string>(TASK_USER_TYPES);
  const result: TaskUserType[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || !allowed.has(value) || result.includes(value as TaskUserType)) continue;
    result.push(value as TaskUserType);
  }
  return result;
}
