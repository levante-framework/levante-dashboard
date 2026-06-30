export const TASK_FIELD_SCALAR_TYPES = ['string', 'number', 'boolean'] as const;
export const TASK_FIELD_TYPES = [...TASK_FIELD_SCALAR_TYPES, 'array'] as const;
export const TASK_ARRAY_ITEM_TYPES = ['string', 'number', 'boolean'] as const;
export const TASK_USER_TYPES = ['caregiver', 'student', 'teacher'] as const;

export type TaskFieldScalarType = (typeof TASK_FIELD_SCALAR_TYPES)[number];
export type TaskFieldType = (typeof TASK_FIELD_TYPES)[number];
export type TaskArrayItemType = (typeof TASK_ARRAY_ITEM_TYPES)[number];
export type TaskUserType = (typeof TASK_USER_TYPES)[number];

export interface TaskDynamicField {
  name: string;
  type: TaskFieldType;
  value: string | number | boolean | (string | number | boolean)[];
  itemType?: TaskArrayItemType;
}
