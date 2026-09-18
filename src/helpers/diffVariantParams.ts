import type { VariantParamDiff, VariantParamValue } from '@/types/taskCatalog';

export function diffVariantParams(
  previous: Record<string, VariantParamValue> = {},
  next: Record<string, VariantParamValue> = {},
): VariantParamDiff {
  const added: VariantParamDiff['added'] = {};
  const removed: VariantParamDiff['removed'] = {};
  const changed: VariantParamDiff['changed'] = {};

  for (const [key, value] of Object.entries(next)) {
    if (!(key in previous)) {
      added[key] = value;
      continue;
    }
    if (previous[key] !== value) {
      changed[key] = { from: previous[key], to: value };
    }
  }

  for (const [key, value] of Object.entries(previous)) {
    if (!(key in next)) {
      removed[key] = value;
    }
  }

  return { added, removed, changed };
}

export function hasVariantParamDiff(diff: VariantParamDiff): boolean {
  return (
    Object.keys(diff.added).length > 0 || Object.keys(diff.removed).length > 0 || Object.keys(diff.changed).length > 0
  );
}
