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
import useUpdateUserMutation from './useUpdateUserMutation';
import type { Ref } from 'vue';

// --- Types ---
// Define interfaces based on the composable source
interface UserUpdateData {
    email?: string;
    [key: string]: any; // Allow other fields
}
interface UserUpdatePayload {
    userId: string;
    userData: UserUpdateData;
}

// Mock structures
interface MockRoarFirekit {
  // updateUserData expects userId and userData separately
  updateUserData: (userId: string, userData: UserUpdateData) => Promise<void>;
}
interface MockAuthStore {
  roarfirekit?: MockRoarFirekit;
  isFirekitInit?: boolean;
}

// --- Mocks ---
const mockUpdateUserData = vi.fn();
const mockInvalidateQueries = vi.fn();

let mockAuthStoreState: MockAuthStore = {
  roarfirekit: { updateUserData: mockUpdateUserData },
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
describe('useUpdateUserMutation', () => {
  let queryClient: QueryClient;

  // Mock payload matching the defined structure
  const mockUserPayload: UserUpdatePayload = {
      userId: 'mock-user-id',
      userData: { email: 'updated-mock-user@stanford.edu' }
  };

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    mockUpdateUserData.mockResolvedValue(undefined);
    mockAuthStoreState = {
      roarfirekit: { updateUserData: mockUpdateUserData },
      isFirekitInit: true,
    };
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call updateUserData when the mutation is triggered', async () => {
    const [result] = withSetup(() => useUpdateUserMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync }: { mutateAsync: (payload: UserUpdatePayload) => Promise<void> } = result;
    await mutateAsync(mockUserPayload);

    // Verify updateUserData called with separate userId and userData
    expect(mockUpdateUserData).toHaveBeenCalledWith(mockUserPayload.userId, mockUserPayload.userData);
  });

  it('should invalidate user queries upon mutation success', async () => {
    const [result] = withSetup(() => useUpdateUserMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
    }: {
      mutateAsync: (payload: UserUpdatePayload) => Promise<void>;
      isSuccess: Ref<boolean>;
    } = result;

    await mutateAsync(mockUserPayload);

    expect(isSuccess.value).toBe(true);
    // Check USER_DATA_QUERY_KEY is invalidated
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-data'] }); // Assuming USER_DATA_QUERY_KEY is 'user-data'
  });

  it('should not invalidate user queries upon mutation failure', async () => {
    const mockError = new Error('User update failed');
    mockUpdateUserData.mockRejectedValue(mockError);

    const [result] = withSetup(() => useUpdateUserMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
      isError,
    }: {
      mutateAsync: (payload: UserUpdatePayload) => Promise<void>;
      isSuccess: Ref<boolean>;
      isError: Ref<boolean>;
    } = result;

    await expect(mutateAsync(mockUserPayload)).rejects.toThrow(mockError);

    expect(isSuccess.value).toBe(false);
    expect(isError.value).toBe(true);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('should throw error if roarfirekit is not initialized', async () => {
    mockAuthStoreState = {
      roarfirekit: undefined,
      isFirekitInit: false,
    };

    const [result] = withSetup(() => useUpdateUserMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync }: { mutateAsync: (payload: UserUpdatePayload) => Promise<void> } = result;

    await expect(mutateAsync(mockUserPayload)).rejects.toThrow('Roarfirekit is not initialized');
    expect(mockUpdateUserData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
}); 