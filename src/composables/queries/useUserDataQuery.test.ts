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
const mockFetchDocById = vi.fn().mockResolvedValue(null);
vi.mock('@/helpers/query/utils', () => ({
  fetchDocById: mockFetchDocById,
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
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
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]] // Correct plugin setup
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
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
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
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
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

  it('should only fetch data once the relevant user ID (auth or manual) is available', async () => {
    // Start with no auth user ID and no manual ID
    piniaInstance.state.value.auth = { roarUid: null };
    let manualUserId: string | null = null; // Use plain variable

    const queryOptions = { enabled: true }; // Untyped

    // Initial setup - uses auth ID if manual is null/undefined
    const { rerender } = withSetup(() => useUserDataQuery(manualUserId, queryOptions), { 
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['user', null], // Initially uses auth ID (null)
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // False because ID is null
    });
    expect(mockFetchDocById).not.toHaveBeenCalled();

    // Set manual ID - should now use this and enable query
    manualUserId = nanoid();
    await rerender({ userId: manualUserId }); // Rerender might be needed if composable doesn't watch ref deeply
    await nextTick(); 
    
    // Query key should update, enabled should be true, fetch should be called
    // Check fetch call first
    expect(mockFetchDocById).toHaveBeenCalledWith('users', manualUserId);
    // Optionally check updated queryKey
    // expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['user', manualUserId] }));
  });

  it('should not let queryOptions override the internally computed value (missing ID)', async () => {
    piniaInstance.state.value.auth = { roarUid: null };
    const manualUserId: string | null = null;
    const queryOptions = { enabled: true }; // Untyped

    withSetup(() => useUserDataQuery(manualUserId, queryOptions), {
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['user', null], // Uses null initially
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Stays false
    });
    expect(mockFetchDocById).not.toHaveBeenCalled();
  });
}); 