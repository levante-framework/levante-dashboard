import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchByTaskId, taskFetcher } from '@/helpers/query/tasks';
import { logger } from '@/logger';
import { withSetup } from '@/test-support/withSetup.js';
import useTasksQuery from './useTasksQuery';

vi.mock('@/helpers/query/tasks', () => ({
  taskFetcher: vi.fn().mockImplementation(() => []),
  fetchByTaskId: vi.fn().mockImplementation(() => []),
}));

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = (await getModule()) as typeof import('@tanstack/vue-query');
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useTasksQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
    vi.mocked(logger.error).mockClear();
    vi.mocked(fetchByTaskId).mockReset();
    vi.mocked(taskFetcher).mockReset();
    vi.mocked(fetchByTaskId).mockImplementation(() => Promise.resolve([]));
    vi.mocked(taskFetcher).mockImplementation(() => Promise.resolve([]));
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters when fetching all tasks', () => {
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksQuery(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks'],
        queryFn: expect.any(Function),
      }),
    );

    expect(taskFetcher).toHaveBeenCalledWith(false, true);
  });

  it('should call query with correct parameters when fetching registered tasks', () => {
    const fetchRegisteredTasks = true;
    const taskIds = null;
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksQuery(fetchRegisteredTasks, taskIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', 'registered'],
        queryFn: expect.any(Function),
        enabled: true,
      }),
    );

    expect(taskFetcher).toHaveBeenCalledWith(true, true);
  });

  it('should call query with correct parameters when fetching specific tasks', () => {
    const fetchRegisteredTasks = false;
    const taskIds = ref(['mock-task-1', 'mock-task-2']);
    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksQuery(fetchRegisteredTasks, taskIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', taskIds],
        queryFn: expect.any(Function),
        enabled: true,
      }),
    );

    expect(fetchByTaskId).toHaveBeenCalledWith(taskIds.value);
  });

  it('propagates fetchByTaskId failures without logging in queryFn', async () => {
    const taskIds = ref(['mock-task-1']);
    const networkError = new Error('tasks failed');
    vi.mocked(fetchByTaskId).mockRejectedValueOnce(networkError);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksQuery(false, taskIds, { enabled: false } as QueryOptionsWithEnabled), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const lastCallArgs = vi.mocked(VueQuery.useQuery).mock.calls.at(-1)?.[0] as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(lastCallArgs.queryFn()).rejects.toThrow('tasks failed');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
