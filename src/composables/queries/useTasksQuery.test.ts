import { ref, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
// Import helpers and types
import { taskFetcher, fetchByTaskId, type TaskData } from '@/helpers/query/tasks';
import useTasksQuery from './useTasksQuery';

// --- Mocks ---
const mockTaskFetcher = vi.fn().mockResolvedValue([]);
const mockFetchByTaskId = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/tasks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/helpers/query/tasks')>();
  return {
    ...original,
    taskFetcher: mockTaskFetcher,
    fetchByTaskId: mockFetchByTaskId,
  };
});

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(original.useQuery);
  return {
    ...original,
    useQuery: mockUseQuery,
  };
});

// --- Tests ---
describe('useTasksQuery', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    // Restore default mock implementation
    const originalVueQuery = await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query');
    mockUseQuery.mockImplementation(originalVueQuery.useQuery);
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters when fetching all tasks', () => {
    // No specific args needed for default fetch
    withSetup(() => useTasksQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['tasks']);
    expect(queryArgs.queryFn).toEqual(expect.any(Function));

    // Call queryFn to trigger fetcher
    queryArgs.queryFn();

    // Default behavior is taskFetcher(false, true)
    expect(mockTaskFetcher).toHaveBeenCalledWith(false, true);
    expect(mockFetchByTaskId).not.toHaveBeenCalled();
  });

  it('should call query with correct parameters when fetching registered tasks', () => {
    const fetchRegisteredTasks: Ref<boolean> = ref(true);
    const taskIds: Ref<string[] | undefined> = ref(undefined); // No specific IDs
    const queryOptions = { enabled: true } as any; // Use 'as any' for simplicity

    withSetup(() => useTasksQuery(fetchRegisteredTasks, taskIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['tasks', 'registered']);
    expect(queryArgs.queryFn).toEqual(expect.any(Function));
    expect(queryArgs.enabled).toBe(true);

    // Call queryFn to trigger fetcher
    queryArgs.queryFn();

    // Expect taskFetcher with registered flag true
    expect(mockTaskFetcher).toHaveBeenCalledWith(true, true);
    expect(mockFetchByTaskId).not.toHaveBeenCalled();
  });

  it('should call query with correct parameters when fetching specific tasks', () => {
    const fetchRegisteredTasks: Ref<boolean> = ref(false);
    const taskIds: Ref<string[] | undefined> = ref(['mock-task-1', 'mock-task-2']);
    const queryOptions = { enabled: true } as any; // Use 'as any' for simplicity

    withSetup(() => useTasksQuery(fetchRegisteredTasks, taskIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['tasks', taskIds.value]); // Key includes the array
    expect(queryArgs.queryFn).toEqual(expect.any(Function));
    expect(queryArgs.enabled).toBe(true);

    // Call queryFn to trigger fetcher
    queryArgs.queryFn();

    // Expect fetchByTaskId with the array of IDs
    expect(mockFetchByTaskId).toHaveBeenCalledWith(taskIds.value);
    expect(mockTaskFetcher).not.toHaveBeenCalled();
  });
}); 