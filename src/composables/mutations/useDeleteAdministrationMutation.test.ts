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
import useDeleteAdministrationMutation from './useDeleteAdministrationMutation';
import type { Ref } from 'vue';

// --- Types ---
// Payload is just the administration ID string
type AdministrationId = string;

// Mock structure for roarfirekit
interface MockRoarFirekit {
  deleteAdministration: (adminId: AdministrationId) => Promise<void>;
}

// Mock structure for Auth Store
interface MockAuthStore {
  roarfirekit?: MockRoarFirekit;
  isFirekitInit?: boolean;
}

// --- Mocks ---
const mockDeleteAdministration = vi.fn();
const mockInvalidateQueries = vi.fn();

// Configurable mock for Auth Store
let mockAuthStoreState: MockAuthStore = {
  roarfirekit: { deleteAdministration: mockDeleteAdministration },
  isFirekitInit: true,
};

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}));

// Mock Vue Query's useQueryClient
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  return {
    ...original,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    })),
    useMutation: original.useMutation, // Keep original useMutation
  };
});

// --- Tests ---
describe('useDeleteAdministrationMutation', () => {
  let queryClient: QueryClient;
  const mockAdministrationId: AdministrationId = nanoid();

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    // Reset mock states
    mockDeleteAdministration.mockResolvedValue(undefined);
    mockAuthStoreState = {
      roarfirekit: { deleteAdministration: mockDeleteAdministration },
      isFirekitInit: true,
    };
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call deleteAdministration when the mutation is triggered', async () => {
    const [result] = withSetup(() => useDeleteAdministrationMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Type mutateAsync
    const { mutateAsync }: { mutateAsync: (adminId: AdministrationId) => Promise<void> } = result;
    await mutateAsync(mockAdministrationId);

    expect(mockDeleteAdministration).toHaveBeenCalledWith(mockAdministrationId);
  });

  it('should invalidate relevant queries upon mutation success', async () => {
    const [result] = withSetup(() => useDeleteAdministrationMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
    }: {
      mutateAsync: (adminId: AdministrationId) => Promise<void>;
      isSuccess: Ref<boolean>;
    } = result;

    await mutateAsync(mockAdministrationId);

    expect(isSuccess.value).toBe(true);
    // Check specific query keys
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['administrations'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['administrations-list'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['administration-assignments'] });
  });

  it('should not invalidate queries upon mutation failure', async () => {
    const mockError = new Error('Deletion failed');
    mockDeleteAdministration.mockRejectedValue(mockError);

    const [result] = withSetup(() => useDeleteAdministrationMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const {
      mutateAsync,
      isSuccess,
      isError,
    }: {
      mutateAsync: (adminId: AdministrationId) => Promise<void>;
      isSuccess: Ref<boolean>;
      isError: Ref<boolean>;
    } = result;

    await expect(mutateAsync(mockAdministrationId)).rejects.toThrow(mockError);

    expect(isSuccess.value).toBe(false);
    expect(isError.value).toBe(true);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('should throw error if roarfirekit is not initialized', async () => {
    // Configure mock state for this test
    mockAuthStoreState = {
      roarfirekit: undefined,
      isFirekitInit: false,
    };

    const [result] = withSetup(() => useDeleteAdministrationMutation(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync }: { mutateAsync: (adminId: AdministrationId) => Promise<void> } = result;

    await expect(mutateAsync(mockAdministrationId)).rejects.toThrow('Roarfirekit is not initialized');
    expect(mockDeleteAdministration).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
}); 