import type { SerializedTaskVariant, VariantParamValue } from '@/types/taskCatalog';

export type VariantParamFilterJoin = 'AND' | 'OR';

export interface VariantParamFilterClause {
  id: string;
  join: VariantParamFilterJoin;
  key: string | null;
  valueToken: string | null;
}

export interface VariantParamValueOption {
  label: string;
  token: string;
}

export function serializeVariantParamValue(value: VariantParamValue): string {
  return JSON.stringify(value);
}

export function createVariantParamFilterClause(
  join: VariantParamFilterJoin = 'AND',
  id = crypto.randomUUID(),
): VariantParamFilterClause {
  return {
    id,
    join,
    key: null,
    valueToken: null,
  };
}

function isCompleteClause(clause: VariantParamFilterClause): boolean {
  return Boolean(clause.key) && clause.valueToken !== null && clause.valueToken !== '';
}

export function collectVariantParamOptions(variants: SerializedTaskVariant[] = []): {
  keys: string[];
  valuesByKey: Record<string, VariantParamValueOption[]>;
} {
  const valuesByKey: Record<string, Map<string, VariantParamValueOption>> = {};

  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.params ?? {})) {
      if (!valuesByKey[key]) valuesByKey[key] = new Map();
      const token = serializeVariantParamValue(value);
      if (!valuesByKey[key].has(token)) {
        valuesByKey[key].set(token, { token, label: token });
      }
    }
  }

  const keys = Object.keys(valuesByKey).sort((a, b) => a.localeCompare(b));
  const optionsByKey: Record<string, VariantParamValueOption[]> = {};
  for (const key of keys) {
    optionsByKey[key] = [...valuesByKey[key].values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  return { keys, valuesByKey: optionsByKey };
}

function clauseMatchesParams(params: Record<string, VariantParamValue>, clause: VariantParamFilterClause): boolean {
  if (!clause.key || clause.valueToken === null) return false;
  if (!(clause.key in params)) return false;
  return serializeVariantParamValue(params[clause.key]) === clause.valueToken;
}

function groupClausesByOr(clauses: VariantParamFilterClause[]): VariantParamFilterClause[][] {
  const groups: VariantParamFilterClause[][] = [];
  let current: VariantParamFilterClause[] = [];

  for (const clause of clauses) {
    if (current.length === 0 || clause.join !== 'OR') {
      current.push(clause);
      continue;
    }
    groups.push(current);
    current = [clause];
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

export function variantMatchesParamFilters(
  params: Record<string, VariantParamValue> | undefined,
  clauses: VariantParamFilterClause[],
): boolean {
  const complete = clauses.filter(isCompleteClause);
  if (complete.length === 0) return true;

  const groups = groupClausesByOr(complete);
  return groups.some((group) => group.every((clause) => clauseMatchesParams(params ?? {}, clause)));
}

export function hasCompleteParamFilters(clauses: VariantParamFilterClause[] = []): boolean {
  return clauses.some(isCompleteClause);
}

export function filterVariantsByParamQuery(
  variants: SerializedTaskVariant[] = [],
  clauses: VariantParamFilterClause[] = [],
): SerializedTaskVariant[] {
  if (!hasCompleteParamFilters(clauses)) return variants;
  return variants.filter((variant) => variantMatchesParamFilters(variant.params, clauses));
}
