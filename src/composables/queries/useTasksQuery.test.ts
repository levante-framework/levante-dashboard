import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup.js';
import * as VueQuery from '@tanstack/vue-query';
import { type QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { taskFetcher, fetchByTaskId } from '@/helpers/query/tasks';
import useTasksQuery from './useTasksQuery';

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('pinia', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    storeToRefs: vi.fn((store) => ({
      currentSite: ref(store.currentSite),
    })),
  };
});

vi.mock('@/helpers/query/tasks', () => ({
  taskFetcher: vi.fn().mockImplementation(() => []),
  fetchByTaskId: vi.fn().mockImplementation(() => []),
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useTasksQuery', () => {
  let queryClient: QueryClient;
  const mockSiteId = 'mock-site-id';

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
    useAuthStore.mockReturnValue({
      currentSite: mockSiteId,
    });
  });

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it('should call query with correct parameters when fetching all tasks', async () => {
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksQuery(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await vi.waitFor(() => {
      expect(taskFetcher).toHaveBeenCalledWith(false, mockSiteId);
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.any(Object),
        queryFn: expect.any(Function),
        enabled: expect.any(Function),
      }),
    );
  });

  it('should call query with correct parameters when fetching registered tasks', async () => {
    const fetchRegisteredTasks = true;
    const taskIds = null;
    const queryOptions = { enabled: true };

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useTasksQuery(fetchRegisteredTasks, taskIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await vi.waitFor(() => {
      expect(taskFetcher).toHaveBeenCalledWith(true, mockSiteId);
    });
  });

  it('should call query with correct parameters when fetching specific tasks', async () => {
    const fetchRegisteredTasks = false;
    const taskIds = ref(['mock-task-1', 'mock-task-2']);
    const queryOptions = { enabled: true };

    withSetup(() => useTasksQuery(fetchRegisteredTasks, taskIds, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await vi.waitFor(() => {
      expect(fetchByTaskId).toHaveBeenCalledWith(taskIds, mockSiteId);
    });
  });
});
