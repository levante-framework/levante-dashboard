import { ref, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
import useTasksDictionaryQuery from './useTasksDictionaryQuery';
// Assuming useTasksDictionaryQuery relies on useTasksQuery which uses taskFetcher
import { taskFetcher } from '@/helpers/query/tasks';

// --- Mocks ---
// Mock the underlying fetcher if useTasksQuery uses it
const mockTaskFetcher = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/tasks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/helpers/query/tasks')>();
  return {
    ...original,
    taskFetcher: mockTaskFetcher,
    // Mock other task helpers if needed, keep fetchByTaskId if used elsewhere
    fetchByTaskId: vi.fn().mockResolvedValue(null),
  };
});

// Mock vue-query's useQuery - crucial for this test
const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  // Default mock implementation for useQuery
  mockUseQuery.mockImplementation(() => ({
    data: ref(null),
    isLoading: ref(false),
    isError: ref(false),
    error: ref(null),
  }));
  // Allow specific tests to override
  return {
    ...original,
    useQuery: mockUseQuery,
    QueryClient: original.QueryClient,
    VueQueryPlugin: original.VueQueryPlugin,
  };
});

// --- Types ---
// Define TaskData based on usage
interface TaskData {
  id: string;
  name: string;
}

// --- Tests ---
describe('useTasksDictionaryQuery', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    // Reset mock to default before each test
    const originalVueQuery = await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query');
    mockUseQuery.mockImplementation(() => ({
      data: ref(null),
      isLoading: ref(false),
      isError: ref(false),
      error: ref(null),
    }));
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should return an empty dictionary when data is undefined', () => {
    const [result] = withSetup(() => useTasksDictionaryQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Destructure the computed dictionary property
    const { tasksDictionary } = result;

    expect(tasksDictionary.value).toEqual({});
  });

  it('should return a dictionary of tasks when data is an array', () => {
    const mockData: TaskData[] = [
      { id: '1', name: 'Task 1' },
      { id: '2', name: 'Task 2' },
    ];

    mockUseQuery.mockImplementation(() => ({
      data: ref(mockData),
      isLoading: ref(false),
      isFetching: ref(false),
      isError: ref(false),
      error: ref(null),
    }));

    const [result] = withSetup(() => useTasksDictionaryQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Destructure the computed dictionary property
    const { tasksDictionary } = result;

    expect(tasksDictionary.value).toEqual({
      1: { id: '1', name: 'Task 1' },
      2: { id: '2', name: 'Task 2' },
    });
  });

  it('should return the query state properties along with the dictionary', () => {
    const mockData: TaskData[] = [
      { id: '1', name: 'Task 1' },
      { id: '2', name: 'Task 2' },
    ];

    mockUseQuery.mockImplementation(() => ({
      data: ref(mockData),
      isLoading: ref(true),
      isFetching: ref(false),
      isError: ref(false),
      error: ref(null),
    }));

    const [result] = withSetup(() => useTasksDictionaryQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Destructure needed properties
    const { tasksDictionary, isLoading, error } = result;

    expect(tasksDictionary.value).toEqual({
      1: { id: '1', name: 'Task 1' },
      2: { id: '2', name: 'Task 2' },
    });
    expect(isLoading.value).toBe(true);
    expect(error.value).toBe(null);
  });

  it('should call query with correct parameters', () => {
    withSetup(() => useTasksDictionaryQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks-dictionary'],
        enabled: true, // Assuming default enabled is true
      })
    );
  });

  it('should allow the query to be disabled via the passed query options', () => {
    // Use any for options type
    const queryOptions: any = { 
      // queryKey is set internally
      enabled: false 
    }; 

    // Pass options
    withSetup(() => useTasksDictionaryQuery(queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks-dictionary'],
        enabled: false,
      })
    );
  });
}); 