import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup';
import {
  QueryClient,
  VueQueryPlugin,
  useQueryClient,
  useMutation,
} from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import useAddTaskMutation from './useAddTaskMutation';
import type { Ref } from 'vue';

// --- Types ---
// Match the payload expected by the mutation function
interface NewTaskPayload {
  taskId: string; // Renamed from id
  taskName?: string; // Renamed from name
  // Add other optional fields if needed for tests
  description?: string;
}

interface MockRoarFirekit {
  // Ensure the function signature matches what's expected
  registerTaskVariant: (task: NewTaskPayload) => Promise<void>;
}

interface MockAuthStore {
  roarfirekit?: MockRoarFirekit;
  // Add isFirekitInit property to satisfy composable check
  isFirekitInit?: boolean;
}

// --- Mocks ---
const mockRegisterTaskVariant = vi.fn();
const mockInvalidateQueries = vi.fn();

// Make the mock configurable and type it explicitly
let mockAuthStoreState: MockAuthStore = {
  roarfirekit: { registerTaskVariant: mockRegisterTaskVariant },
  isFirekitInit: true,
};

vi.mock('@/store/auth', () => ({
  // Return the configurable state object
  useAuthStore: vi.fn(() => mockAuthStoreState),
}));

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  return {
    ...original,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    })),
    useMutation: original.useMutation,
  };
});

// --- Tests ---
describe('useAddTaskMutation', () => {
  let queryClient: QueryClient;

  // Update mock task data to match NewTaskPayload
  const mockTaskPayload: NewTaskPayload = {
    taskId: 'mock-test-task',
    taskName: 'Mock Test Task',
  };

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    mockRegisterTaskVariant.mockResolvedValue(undefined);
    // Reset mock state to default using the explicit type
    mockAuthStoreState = {
      roarfirekit: { registerTaskVariant: mockRegisterTaskVariant },
      isFirekitInit: true,
    };
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call registerTaskVariant when the mutation is triggered', async () => {
    const [result] = withSetup(() => useAddTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Type mutateAsync correctly
    const { mutateAsync }: { mutateAsync: (payload: NewTaskPayload) => Promise<void> } = result;
    await mutateAsync(mockTaskPayload);

    expect(mockRegisterTaskVariant).toHaveBeenCalledWith(mockTaskPayload);
  });

  it('should invalidate task queries upon mutation success', async () => {
    const [result] = withSetup(() => useAddTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
    }: {
      mutateAsync: (payload: NewTaskPayload) => Promise<void>;
      isSuccess: Ref<boolean>;
    } = result;

    await mutateAsync(mockTaskPayload);

    expect(isSuccess.value).toBe(true);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });

  it('should not invalidate task queries upon mutation failure', async () => {
    const mockError = new Error('Mock error');
    mockRegisterTaskVariant.mockRejectedValue(mockError);

    const [result] = withSetup(() => useAddTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
      isError,
    }: {
      mutateAsync: (payload: NewTaskPayload) => Promise<void>;
      isSuccess: Ref<boolean>;
      isError: Ref<boolean>;
    } = result;

    await expect(mutateAsync(mockTaskPayload)).rejects.toThrow(mockError);

    expect(isSuccess.value).toBe(false);
    expect(isError.value).toBe(true);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('should throw error if roarfirekit is not initialized', async () => {
    // Configure the mock state (now type-safe)
    mockAuthStoreState = {
      roarfirekit: undefined, // Allowed by MockAuthStore interface
      isFirekitInit: false,
    };

    const [result] = withSetup(() => useAddTaskMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync } : { mutateAsync: (payload: NewTaskPayload) => Promise<void> } = result;

    await expect(mutateAsync(mockTaskPayload)).rejects.toThrow('Roarfirekit is not initialized');
    expect(mockRegisterTaskVariant).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
}); 