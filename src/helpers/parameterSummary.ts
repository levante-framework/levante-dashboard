import type { VariantSummary } from '@/types/task';

export interface ParamKeyOccurrence {
  paramKey: string;
  taskId: string;
  taskName: string;
  variantId: string;
  variantName: string;
  schemaVersion?: number;
  registered?: boolean;
}

export interface AggregatedParamKey {
  paramKey: string;
  taskNames: string;
  taskIds: string;
  variantNames: string;
  variantIds: string;
  schemaVersions: string;
  registeredStatuses: string;
  variantCount: number;
}

export interface TaskParamKeyGroup {
  taskId: string;
  taskName: string;
  paramKeys: AggregatedParamKey[];
}

export function coalesceUnique(values: Array<string | number | boolean | undefined | null>): string {
  const unique = [...new Set(values.filter((value) => value != null && value !== '').map(String))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  return unique.length ? unique.join(', ') : '—';
}

export function collectParamOccurrences(variants: VariantSummary[]): ParamKeyOccurrence[] {
  const occurrences: ParamKeyOccurrence[] = [];

  for (const variant of variants) {
    for (const paramKey of Object.keys(variant.params ?? {})) {
      occurrences.push({
        paramKey,
        taskId: variant.taskId,
        taskName: variant.taskName || variant.taskId,
        variantId: variant.id,
        variantName: variant.name || variant.id,
        schemaVersion: variant.schemaVersion,
        registered: variant.registered,
      });
    }
  }

  return occurrences;
}

export function aggregateParamKeys(occurrences: ParamKeyOccurrence[]): AggregatedParamKey[] {
  const grouped = new Map<string, ParamKeyOccurrence[]>();

  for (const occurrence of occurrences) {
    const existing = grouped.get(occurrence.paramKey) ?? [];
    existing.push(occurrence);
    grouped.set(occurrence.paramKey, existing);
  }

  return [...grouped.entries()]
    .map(([paramKey, items]) => ({
      paramKey,
      taskNames: coalesceUnique(items.map((item) => item.taskName)),
      taskIds: coalesceUnique(items.map((item) => item.taskId)),
      variantNames: coalesceUnique(items.map((item) => item.variantName)),
      variantIds: coalesceUnique(items.map((item) => item.variantId)),
      schemaVersions: coalesceUnique(items.map((item) => item.schemaVersion)),
      registeredStatuses: coalesceUnique(
        items.map((item) => (item.registered === false ? 'Unregistered' : 'Registered')),
      ),
      variantCount: items.length,
    }))
    .sort((a, b) => a.paramKey.localeCompare(b.paramKey));
}

export function buildFlatParamKeySummary(variants: VariantSummary[]): AggregatedParamKey[] {
  return aggregateParamKeys(collectParamOccurrences(variants));
}

export function buildTaskGroupedParamKeySummary(variants: VariantSummary[]): TaskParamKeyGroup[] {
  const variantsByTask = new Map<string, VariantSummary[]>();

  for (const variant of variants) {
    const existing = variantsByTask.get(variant.taskId) ?? [];
    existing.push(variant);
    variantsByTask.set(variant.taskId, existing);
  }

  return [...variantsByTask.entries()]
    .map(([taskId, taskVariants]) => {
      const taskName = taskVariants[0]?.taskName || taskId;
      return {
        taskId,
        taskName,
        paramKeys: aggregateParamKeys(collectParamOccurrences(taskVariants)),
      };
    })
    .filter((group) => group.paramKeys.length > 0)
    .sort((a, b) => a.taskName.localeCompare(b.taskName));
}
