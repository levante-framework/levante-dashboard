import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  // Keep UseQueryOptions commented out
  // type UseQueryOptions,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { useAuthStore } from '@/store/auth';
import { fetchDocById } from '@/helpers/query/utils';
import useUserDataQuery from './useUserDataQuery';

// --- Mocks ---
// Define ALL mock variables BEFORE vi.mock calls
const mockFetchDocById = vi.fn().mockResolvedValue(null);
const mockUseQuery = vi.fn();

// Now define the mocks using the variables
vi.mock('@/helpers/query/utils', () => ({
  fetchDocById: mockFetchDocById,
}));

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  // This should now work as mockUseQuery is initialized
  mockUseQuery.mockImplementation(original.useQuery);
  return {
    ...original,
    useQuery: mockUseQuery,
  };
});

// --- Types ---
// Placeholder type for the data returned by the query
interface UserData {
  id: string;
  name?: string;
  // Add other relevant properties if known
}

interface AuthState {
    roarUid: string | null;
    // Add other necessary state properties used by the composable
}

// --- Tests ---
describe('useUserDataQuery', () => {
  let piniaInstance: TestingPinia;
  let queryClient: QueryClient;

  beforeEach(() => {
    piniaInstance = createTestingPinia({ 
        createSpy: vi.fn, 
        initialState: { 
            auth: { roarUid: null } // Default state
        }
    });
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with auth user ID when no specific ID is provided', () => {
    const mockAuthUserId = nanoid();
    piniaInstance.state.value.auth = { roarUid: mockAuthUserId }; // Set auth user ID

    withSetup(() => useUserDataQuery(), { // Call without arguments
        plugins: [[VueQueryPlugin, { queryClient }]] // Remove piniaInstance
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['user', mockAuthUserId], // Uses auth user ID
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({ value: true }), // Enabled because ID is present
      }),
    );
    expect(mockFetchDocById).toHaveBeenCalledWith('users', mockAuthUserId);
  });

  it('should use the manually provided user ID when available', async () => {
    const mockAuthUserId = nanoid();
    const manualUserId: string = nanoid(); // Use plain string
    piniaInstance.state.value.auth = { roarUid: mockAuthUserId }; // Set auth user ID (should be ignored)

    withSetup(() => useUserDataQuery(manualUserId), { // Pass manual ID
        plugins: [[VueQueryPlugin, { queryClient }]] // Remove piniaInstance
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['user', manualUserId], // Uses manual user ID Ref
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: true }), // Enabled because manual ID is present
    });
    expect(mockFetchDocById).toHaveBeenCalledWith('users', manualUserId);
  });

  it('should correctly control the enabled state via passed query options', async () => {
    const mockAuthUserId = nanoid();
    piniaInstance.state.value.auth = { roarUid: mockAuthUserId };
    const enableQuery = ref(false);
    const queryOptions = { enabled: enableQuery }; // Untyped

    // Test with default user ID (from auth store)
    withSetup(() => useUserDataQuery(undefined, queryOptions), { 
        plugins: [[VueQueryPlugin, { queryClient }]] // Remove piniaInstance
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['user', mockAuthUserId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Initially false due to ref
    });
    expect(mockFetchDocById).not.toHaveBeenCalled();

    enableQuery.value = true;
    await nextTick();

    expect(mockFetchDocById).toHaveBeenCalledWith('users', mockAuthUserId);
  });

  it('should be disabled if no auth user ID and no manual user ID is provided', () => {
    // Arrange: Ensure auth store has no user ID
    piniaInstance.state.value.auth = { roarUid: null };
    const manualUserId: string | null = null; // Explicitly null
    const queryOptions = { enabled: true }; // Attempt to enable

    // Act
    withSetup(() => useUserDataQuery(manualUserId, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Assert: Query should be disabled because effective ID is null
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({ value: false }),
      })
    );
    expect(mockFetchDocById).not.toHaveBeenCalled();
  });

  it('should be enabled and use manual ID when provided (even if auth ID exists)', () => {
    // Arrange: Auth store has an ID, but we provide a manual one
    piniaInstance.state.value.auth = { roarUid: nanoid() }; 
    const manualUserId: string = nanoid(); // Provide a manual ID
    const queryOptions = { enabled: true }; 

    // Act
    withSetup(() => useUserDataQuery(manualUserId, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Assert: Query should be enabled and use the manual ID
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['user', manualUserId], // Uses manual ID
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({ value: true }),
      })
    );
    expect(mockFetchDocById).toHaveBeenCalledWith('users', manualUserId);
  });

  it('should not let queryOptions override the internally computed value (missing ID)', async () => {
    piniaInstance.state.value.auth = { roarUid: null };
    const manualUserId: string | null = null;
    const queryOptions = { enabled: true }; // Untyped

    withSetup(() => useUserDataQuery(manualUserId, queryOptions), {
        plugins: [[VueQueryPlugin, { queryClient }]] // Remove piniaInstance
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['user', null], // Uses null initially
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Stays false
    });
    expect(mockFetchDocById).not.toHaveBeenCalled();
  });
}); 