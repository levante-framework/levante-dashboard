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
    data: ref(undefined),
    isLoading: ref(false),
    isFetching: ref(false),
    isError: ref(false),
    error: ref(null),
  }));
  // Allow specific tests to override
  return {
    ...original,
    useQuery: mockUseQuery,
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
      data: ref(undefined),
      isLoading: ref(false),
      isFetching: ref(false),
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

  it('should pass queryOptions to the underlying useQuery call', async () => {
    const originalVueQuery = await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query');
    // We need to mock the implementation of the *actual* useQuery here
    // to check the options it receives when called by useTasksQuery
    mockUseQuery.mockImplementation(originalVueQuery.useQuery);

    const queryOptions = { enabled: false, refetchOnWindowFocus: false } as any;

    // Run the composable that internally calls useTasksQuery (which calls useQuery)
    withSetup(() => useTasksDictionaryQuery(queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Assert that our mock (representing the call to useQuery) was called with the options
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining(queryOptions));
  });
}); 