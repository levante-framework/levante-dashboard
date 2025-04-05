export interface Organization {
  id: string;
  name: string;
  type: 'district' | 'school' | 'class' | 'group' | 'family';
  parentId?: string;
  stats?: Record<string, unknown>;
  [key: string]: unknown;
} 