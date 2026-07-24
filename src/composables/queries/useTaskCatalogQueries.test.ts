import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { withSetup } from '@/test-support/withSetup.js';
import useTaskVariantsCatalogQuery from './useTaskVariantsCatalogQuery';
import useTasksCatalogQuery from './useTasksCatalogQuery';
import useVariantParamSpecsQuery from './useVariantParamSpecsQuery';

vi.mock('@/firebase/repositories/TasksRepository', () => ({
  tasksRepository: {
    getTasks: vi.fn().mockResolvedValue([]),
    getTaskVariants: vi.fn().mockResolvedValue([]),
    getVariantParamSpecs: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('task catalog queries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
    vi.mocked(tasksRepository.getTasks).mockClear();
    vi.mocked(tasksRepository.getTaskVariants).mockClear();
    vi.mocked(tasksRepository.getVariantParamSpecs).mockClear();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('useTasksCatalogQuery calls getTasks', () => {
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksCatalogQuery(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks-catalog'],
        queryFn: expect.any(Function),
      }),
    );
  });

  it('useTaskVariantsCatalogQuery passes taskId and sorts newest first', async () => {
    vi.mocked(tasksRepository.getTaskVariants).mockResolvedValue([
      {
        id: 'v2',
        taskId: 'task-1',
        archived: false,
        createdAt: '2024-02-01T00:00:00.000Z',
        name: 'later',
        params: {},
        registered: true,
        updatedAt: '2024-02-01T00:00:00.000Z',
      },
      {
        id: 'v1',
        taskId: 'task-1',
        archived: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        name: 'earlier',
        params: {},
        registered: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    vi.spyOn(VueQuery, 'useQuery');
    const taskId = ref('task-1');

    withSetup(() => useTaskVariantsCatalogQuery({ taskId }), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const call = vi.mocked(VueQuery.useQuery).mock.calls.at(-1)?.[0] as {
      queryFn: () => Promise<{ id: string }[]>;
    };
    const result = await call.queryFn();

    expect(tasksRepository.getTaskVariants).toHaveBeenCalledWith({ taskId: 'task-1' });
    expect(result.map((variant) => variant.id)).toEqual(['v2', 'v1']);
  });

  it('useVariantParamSpecsQuery calls getVariantParamSpecs', () => {
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useVariantParamSpecsQuery(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['variant-param-specs'],
        queryFn: expect.any(Function),
      }),
    );
  });
});
