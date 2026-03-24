import { normalizeCsvData } from '@levante-framework/levante-zod';

export interface LinkUsersCsvValidationError {
  row: number;
  field: string;
  message: string;
}

export interface LinkUsersCsvValidationResult {
  success: boolean;
  errors: LinkUsersCsvValidationError[];
}

function issueRequiredTrimmedString(value: unknown, emptyMessage: string): string | null {
  if (value === undefined || value === null) return 'Invalid input: expected string, received undefined';
  if (typeof value !== 'string') return `Invalid input: expected string, received ${typeof value}`;
  const trimmed = value.trim();
  if (!trimmed) return emptyMessage;
  return null;
}

function issueUserType(value: unknown): string | null {
  if (value === undefined || value === null) return 'Invalid input: expected string, received undefined';
  if (typeof value !== 'string') return `Invalid input: expected string, received ${typeof value}`;
  const trimmed = value.trim();
  if (!trimmed) return 'userType is required';
  let v = trimmed.toLowerCase();
  if (v === 'caregiver') v = 'parent';
  if (!['child', 'parent', 'teacher'].includes(v))
    return 'userType must be one of: child, parent, teacher';
  return null;
}

export function validateLinkUsersCsvRows(data: unknown[]): LinkUsersCsvValidationResult {
  const errors: LinkUsersCsvValidationError[] = [];

  data.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const normalized = normalizeCsvData(row as Record<string, unknown>);
    const rowNum = index + 1;

    const idErr = issueRequiredTrimmedString(normalized.id, 'ID is required');
    if (idErr) errors.push({ row: rowNum, field: 'id', message: idErr });

    const uidErr = issueRequiredTrimmedString(normalized.uid, 'UID is required');
    if (uidErr) errors.push({ row: rowNum, field: 'uid', message: uidErr });

    const utErr = issueUserType(normalized.usertype);
    if (utErr) errors.push({ row: rowNum, field: 'userType', message: utErr });
  });

  return {
    success: errors.length === 0,
    errors,
  };
}
