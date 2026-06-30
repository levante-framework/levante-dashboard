import { describe, expect, it } from 'vitest';
import {
  aggregateParamKeys,
  buildFlatParamKeySummary,
  buildTaskGroupedParamKeySummary,
  coalesceUnique,
  collectParamOccurrences,
} from '@/helpers/parameterSummary';
import type { VariantSummary } from '@/types/task';

const variants: VariantSummary[] = [
  {
    id: 'v1',
    taskId: 'task-a',
    taskName: 'Alpha Task',
    name: 'Default',
    schemaVersion: 1,
    registered: true,
    params: { language: 'en', level: 1 },
  },
  {
    id: 'v2',
    taskId: 'task-a',
    taskName: 'Alpha Task',
    name: 'Spanish',
    schemaVersion: 2,
    registered: false,
    params: { language: 'es', level: 1 },
  },
  {
    id: 'v3',
    taskId: 'task-b',
    taskName: 'Beta Task',
    name: 'Default',
    schemaVersion: 1,
    registered: true,
    params: { language: 'en' },
  },
];

describe('parameterSummary', () => {
  it('coalesceUnique joins unique sorted values', () => {
    expect(coalesceUnique(['Beta', 'Alpha', 'Beta', null, ''])).toBe('Alpha, Beta');
  });

  it('aggregates occurrences by parameter key', () => {
    const aggregated = aggregateParamKeys(collectParamOccurrences(variants));
    const language = aggregated.find((item) => item.paramKey === 'language');

    expect(language).toMatchObject({
      paramKey: 'language',
      taskNames: 'Alpha Task, Beta Task',
      taskIds: 'task-a, task-b',
      schemaVersions: '1, 2',
      registeredStatuses: 'Registered, Unregistered',
      variantCount: 3,
    });
  });

  it('builds flat and grouped summaries', () => {
    expect(buildFlatParamKeySummary(variants)).toHaveLength(2);
    expect(buildTaskGroupedParamKeySummary(variants)).toEqual([
      expect.objectContaining({
        taskId: 'task-a',
        taskName: 'Alpha Task',
        paramKeys: expect.arrayContaining([expect.objectContaining({ paramKey: 'language' })]),
      }),
      expect.objectContaining({
        taskId: 'task-b',
        taskName: 'Beta Task',
      }),
    ]);
  });
});
