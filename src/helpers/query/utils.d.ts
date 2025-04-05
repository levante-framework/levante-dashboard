export interface OrderBy {
  field: { fieldPath: string };
  direction: 'ASCENDING' | 'DESCENDING';
}

export const orderByDefault: OrderBy[];

export function batchGetDocs(paths: string[], fields: string[]): Promise<Record<string, unknown>[]>; 