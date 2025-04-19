import { ref, nextTick, type Ref, computed } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type QueryObserverOptions,
  type UseQueryOptions,
  type QueryKey,
  type UseQueryReturnType
} from '@tanstack/vue-query';
import { withSetup } from '@/test-support/withSetup';
import { orgFetcher } from '@/helpers/query/orgs';
import useDistrictsListQuery from './useDistrictsListQuery';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { useAuthStore } from '@/store/auth';
import type { Pinia } from 'pinia';

// --- Mocks ---
const mockOrgFetcher = vi.fn().mockResolvedValue([]);
const mockUseUserClaimsQuery = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@/helpers/query/orgs', () => ({ 
  orgFetcher: mockOrgFetcher, 
}));

vi.mock('@/composables/queries/useUserClaimsQuery', () => ({ 
  default: mockUseUserClaimsQuery 
}));

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  // Basic implementation for useQuery mock
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), 
    isLoading: ref(false), 
    isError: ref(false), 
    error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    // Explicitly re-export essentials
    QueryClient: (await importOriginal<typeof import('@tanstack/vue-query')>()).QueryClient,
    VueQueryPlugin: (await importOriginal<typeof import('@tanstack/vue-query')>()).VueQueryPlugin,
    // REMOVE QueryKey and UseQueryReturnType re-exports
  };
});

// Define mockAuthStore with more flexible types for refs
const mockAuthStore = {
  isLoggedIn: ref(false),
  user: ref<any | null>(null), // Allow any object or null
  isUserSuperAdmin: ref(false),
  claims: ref<any | null>(null), // Allow any object or null
  areClaimsLoading: ref(true),
};

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}));


// --- Types (Define or import if needed) ---
interface District {
  id: string;
  name?: string;
  // ... other district properties
}

interface OrgData {
  id: string;
  // Add other properties if known or needed based on actual usage
}

interface UserClaims {
    claims: {
        minimalAdminOrgs?: string[];
        super_admin?: boolean;
    }
}

interface UseUserClaimsQueryReturn {
    data: Ref<UserClaims | undefined>;
    isLoading?: Ref<boolean>;
}


// --- Tests ---
describe('useDistrictsListQuery', () => {
  let queryClient: QueryClient;

  const mockUserClaims: Ref<UserClaims> = ref({
    claims: {
      minimalAdminOrgs: ['mock-org-id-1', 'mock-org-id-2'],
      super_admin: false,
    },
  });

  const mockSuperAdminUserClaims: Ref<UserClaims> = ref({
    claims: {
      minimalAdminOrgs: ['mock-org-id-3'],
      super_admin: true,
    },
  });

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();

    // Reset mockAuthStore values before each test
    mockAuthStore.isLoggedIn.value = true;
    mockAuthStore.user.value = { uid: 'test-user-id', email: 'test@example.com' };
    mockAuthStore.isUserSuperAdmin.value = false;
    mockAuthStore.claims.value = { roles: ['district_admin'], districts: ['district1'] };
    mockAuthStore.areClaimsLoading.value = false;
  });

  it('should call query with correct parameters for non-super admin', () => {
    // Setup mock return value for useUserClaimsQuery
    // Make sure the mock claims are set correctly for this specific test scenario
    mockAuthStore.isUserSuperAdmin.value = false;
    mockAuthStore.claims.value = { minimalAdminOrgs: ['mock-org-id-1', 'mock-org-id-2'], super_admin: false };
    mockUseUserClaimsQuery.mockReturnValue({ data: ref(mockAuthStore.claims.value), isLoading: ref(false) }); // Use authStore claims

    withSetup(() => useDistrictsListQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts-list'], // Use string literal
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          value: true, // Enabled because claims are loaded (mocked via authStore)
        }),
      })
    );

    // Verify orgFetcher was called with correct args based on authStore state
    expect(mockOrgFetcher).toHaveBeenCalledWith(
      'districts',
      undefined, // No specific ID needed for list
      expect.objectContaining({ value: false }), // isSuperAdmin from authStore
      expect.objectContaining({ value: ['mock-org-id-1', 'mock-org-id-2'] }) // Filter by admin orgs from authStore claims
    );
  });

  it('should call query with correct parameters for super admin', () => {
    // Set authStore for super admin scenario
    mockAuthStore.isUserSuperAdmin.value = true;
    mockAuthStore.claims.value = { minimalAdminOrgs: ['mock-org-id-3'], super_admin: true };
    mockUseUserClaimsQuery.mockReturnValue({ data: ref(mockAuthStore.claims.value), isLoading: ref(false) });

     withSetup(() => useDistrictsListQuery(), {
       plugins: [[VueQueryPlugin, { queryClient }]],
     });

     expect(mockUseQuery).toHaveBeenCalledWith(
       expect.objectContaining({
         queryKey: ['districts-list'], // Use string literal
         queryFn: expect.any(Function),
         enabled: expect.objectContaining({
             value: true,
         }),
       })
     );

     expect(mockOrgFetcher).toHaveBeenCalledWith(
         'districts',
         undefined,
         expect.objectContaining({ value: true }), // isSuperAdmin from authStore
         expect.objectContaining({ value: ['mock-org-id-3'] }) // Org filter from authStore claims
     );
  });


  it('should only enable the query once user claims are loaded (via authStore)', async () => {
    // Set authStore to loading state initially
    mockAuthStore.areClaimsLoading.value = true;
    mockAuthStore.claims.value = undefined; // Ensure claims are initially undefined
    mockUseUserClaimsQuery.mockReturnValue({ data: ref(mockAuthStore.claims.value), isLoading: ref(mockAuthStore.areClaimsLoading.value) });

    withSetup(() => useDistrictsListQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Initial check: Query should be disabled because authStore.areClaimsLoading is true
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts-list'], // Use string literal
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          value: false,
        }),
      })
    );

    expect(mockOrgFetcher).not.toHaveBeenCalled();

    // Simulate claims loading completion via authStore
    mockAuthStore.claims.value = { super_admin: true, minimalAdminOrgs: ['mock-org-id-3'] }; // Assign claims data
    mockAuthStore.areClaimsLoading.value = false;
    await nextTick(); // Wait for reactivity

    // Manually trigger query refetch or rely on reactivity if possible
    // In tests, sometimes explicit invalidation is needed
    queryClient.invalidateQueries({ queryKey: ['districts-list'] });
    await queryClient.refetchQueries({ queryKey: ['districts-list'] });
    await nextTick();


    // Check if the enabled computed property updates and triggers the fetch
    expect(mockOrgFetcher).toHaveBeenCalledWith(
      'districts',
      undefined,
      expect.objectContaining({ value: true }), // Super admin claims loaded from authStore
      expect.objectContaining({ value: ['mock-org-id-3'] })
    );
  });

  it('should allow the query to be disabled via query options', () => {
    // Arrange
    mockAuthStore.areClaimsLoading.value = false;
    mockAuthStore.isUserSuperAdmin.value = false;
    mockAuthStore.claims.value = { roles: ['district_admin'], districts: ['district1'], minimalAdminOrgs: ['org1'] };

    // Act: Call composable with full options object including queryKey
    const options: UseQueryOptions<OrgData[], Error> = {
      queryKey: ['districts-list'], // Provide the required queryKey
      enabled: false,
    };
    useDistrictsListQuery(options);

    // Assert
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['districts-list'],
        // The internal finalEnabledState will still be false because
        // isEnabledFromOptions will be false.
        enabled: expect.any(Object), 
      })
    );

    // Additional Assert: Check resolved enabled value passed to the *internal* useQuery
    const lastCallArgs = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
    const enabledValue = computed(() => (lastCallArgs.enabled as any).value).value;
    expect(enabledValue).toBe(false);

    // Assert: Data should be undefined, call with full options object
    const { data } = useDistrictsListQuery(options);
    expect(data.value).toBeUndefined();
  });
}); 