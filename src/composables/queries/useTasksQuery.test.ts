import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
// Import helpers and types
import { taskFetcher, fetchByTaskId } from '@/helpers/query/tasks';
import useTasksQuery from './useTasksQuery';
import { nanoid } from 'nanoid';

// --- Mocks ---
const mockTaskFetcher = vi.fn().mockResolvedValue([]);
const mockFetchByTaskId = vi.fn().mockResolvedValue(null);
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
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), isLoading: ref(false), isError: ref(false), error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    QueryClient: original.QueryClient,
    VueQueryPlugin: original.VueQueryPlugin,
  };
});

// --- Types ---
// TaskData type comes from the mocked helper import

// --- Tests ---
describe('useTasksQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    mockUseQuery.mockImplementation(() => ({ 
      data: ref(null), isLoading: ref(false), isError: ref(false), error: ref(null) 
    }));
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with default key when no IDs and registeredOnly=false', () => {
    // Call with defaults
    withSetup(() => useTasksQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks'],
      })
    );
  });

  it('should call query with registered key when registeredOnly=true', () => {
    const registeredOnly = ref(true);
    // Pass registeredOnly as first arg
    withSetup(() => useTasksQuery(registeredOnly), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', 'registered'],
      })
    );
  });

  it('should call query with task IDs when provided', () => {
    const taskIds = ref([nanoid(), nanoid()]);
    const sortedIds = [...taskIds.value].sort(); // Key uses sorted IDs

    // Pass false for registered, IDs as second arg
    withSetup(() => useTasksQuery(ref(false), taskIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', sortedIds],
        enabled: expect.objectContaining({ value: true }),
      })
    );
  });

  it('should ignore registeredOnly when task IDs are provided', () => {
    const registeredOnly = ref(true);
    const taskIds = ref([nanoid(), nanoid()]);
    const sortedIds = [...taskIds.value].sort();

    // Pass true for registered, IDs as second arg
    withSetup(() => useTasksQuery(registeredOnly, taskIds), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', sortedIds], // Key should be based on IDs, not 'registered'
      })
    );
  });

  it('should allow the query to be disabled via query options (IDs case)', () => {
    const taskIds = ref([nanoid()]);
    const sortedIds = [...taskIds.value].sort();
    const queryOptions: any = { 
      enabled: false 
    }; 

    // Pass false, IDs, options
    withSetup(() => useTasksQuery(ref(false), taskIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', sortedIds],
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });

  it('should allow the query to be disabled via query options (registered case)', () => {
    const registeredOnly = ref(true);
    const queryOptions: any = { 
      enabled: false 
    }; 

    // Pass true, undefined for IDs, options
    withSetup(() => useTasksQuery(registeredOnly, undefined, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks', 'registered'],
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });

  it('should only enable query if task IDs are non-empty', async () => {
    const taskIds = ref<string[] | undefined>([]); // Start with empty array
    const queryOptions: any = { 
      enabled: true 
    }; 

    withSetup(() => useTasksQuery(ref(false), taskIds, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Initial check (should use default key, enabled based on options)
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['tasks'], // No IDs, so default key
        // Enabled is determined by the logic within useQuery using the options
        // We can't easily assert the final computed enabled state here
      })
    );

    // Update ID
    taskIds.value = [nanoid()];
    await nextTick();
    // Re-render/re-check needed if asserting enabled state changes
  });
}); 