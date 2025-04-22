import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import {
  QueryClient,
  VueQueryPlugin,
  useQueryClient,
  useMutation,
} from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import useUpdateTaskMutation from './useUpdateTaskMutation';
import type { Ref } from 'vue';

// --- Types ---
// Define interfaces based on the composable source
interface TaskUpdateData {
    taskName?: string;
    [key: string]: any; // Allow other fields
}
interface UpdateTaskPayload {
    taskId: string;
    data: TaskUpdateData;
}

// Mock structures
interface MockRoarFirekit {
  updateTaskOrVariant: (payload: UpdateTaskPayload) => Promise<void>;
}
interface MockAuthStore {
  roarfirekit?: MockRoarFirekit;
  isFirekitInit?: boolean;
}

// --- Mocks ---
const mockUpdateTaskOrVariant = vi.fn();
const mockInvalidateQueries = vi.fn();

let mockAuthStoreState: MockAuthStore = {
  roarfirekit: { updateTaskOrVariant: mockUpdateTaskOrVariant },
  isFirekitInit: true,
};

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}));

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  return {
    ...original,
    useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
    useMutation: original.useMutation,
  };
});

// --- Tests ---
describe('useUpdateTaskMutation', () => {
  let queryClient: QueryClient;

  // Mock payload matching the defined structure
  const mockTaskPayload: UpdateTaskPayload = {
      taskId: 'mock-test-task',
      data: { taskName: 'Updated Mock Test Task' }
  };

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    mockUpdateTaskOrVariant.mockResolvedValue(undefined);
    mockAuthStoreState = {
      roarfirekit: { updateTaskOrVariant: mockUpdateTaskOrVariant },
      isFirekitInit: true,
    };
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call updateTaskOrVariant when the mutation is triggered', async () => {
    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Type mutateAsync correctly
    const { mutateAsync }: { mutateAsync: (payload: UpdateTaskPayload) => Promise<void> } = result;
    await mutateAsync(mockTaskPayload);

    expect(mockUpdateTaskOrVariant).toHaveBeenCalledWith(mockTaskPayload);
  });

  it('should invalidate task queries upon mutation success', async () => {
    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
    }: {
      mutateAsync: (payload: UpdateTaskPayload) => Promise<void>;
      isSuccess: Ref<boolean>;
    } = result;

    await mutateAsync(mockTaskPayload);

    expect(isSuccess.value).toBe(true);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });

  it('should not invalidate task queries upon mutation failure', async () => {
    const mockError = new Error('Update failed');
    mockUpdateTaskOrVariant.mockRejectedValue(mockError);

    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
      isError,
    }: {
      mutateAsync: (payload: UpdateTaskPayload) => Promise<void>;
      isSuccess: Ref<boolean>;
      isError: Ref<boolean>;
    } = result;

    await expect(mutateAsync(mockTaskPayload)).rejects.toThrow(mockError);

    expect(isSuccess.value).toBe(false);
    expect(isError.value).toBe(true);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('should throw error if roarfirekit is not initialized', async () => {
    // Configure mock state
    mockAuthStoreState = {
      roarfirekit: undefined,
      isFirekitInit: false,
    };

    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync }: { mutateAsync: (payload: UpdateTaskPayload) => Promise<void> } = result;

    await expect(mutateAsync(mockTaskPayload)).rejects.toThrow('Roarfirekit is not initialized');
    expect(mockUpdateTaskOrVariant).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
}); 