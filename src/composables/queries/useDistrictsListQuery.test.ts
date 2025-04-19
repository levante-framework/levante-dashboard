import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type QueryObserverOptions,
  type UseQueryOptions,
  type QueryKey
} from '@tanstack/vue-query';
import { withSetup } from '@/test-support/withSetup';
import { orgFetcher } from '@/helpers/query/orgs';
import useDistrictsListQuery from './useDistrictsListQuery';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';

// --- Mocks ---
const mockOrgFetcher = vi.fn().mockResolvedValue([]); // Use mockResolvedValue for async
vi.mock('@/helpers/query/orgs', () => ({
  orgFetcher: mockOrgFetcher,
}));

const mockUseUserClaimsQuery = vi.fn();
vi.mock('@/composables/queries/useUserClaimsQuery', () => ({
    default: mockUseUserClaimsQuery // Mock the default export
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(original.useQuery); // Implement mock before returning
  return {
    ...original,
    useQuery: mockUseQuery,
  };
});

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
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters for non-super admin', () => {
    // Setup mock return value for useUserClaimsQuery
    mockUseUserClaimsQuery.mockReturnValue({ data: mockUserClaims, isLoading: ref(false) } as UseUserClaimsQueryReturn);

    withSetup(() => useDistrictsListQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts-list'],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: true, // Enabled because claims are loaded
      }),
    });

    // Verify orgFetcher was called with correct args
    expect(mockOrgFetcher).toHaveBeenCalledWith(
      'districts',
      undefined, // No specific ID needed for list
      expect.objectContaining({ value: false }), // isSuperAdmin = false
      expect.objectContaining({ value: ['mock-org-id-1', 'mock-org-id-2'] }) // Filter by admin orgs
    );
  });

  it('should call query with correct parameters for super admin', () => {
     mockUseUserClaimsQuery.mockReturnValue({ data: mockSuperAdminUserClaims, isLoading: ref(false) } as UseUserClaimsQueryReturn);

      withSetup(() => useDistrictsListQuery(), {
        plugins: [[VueQueryPlugin, { queryClient }]],
      });

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['districts-list'],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
            value: true,
        }),
      });

      expect(mockOrgFetcher).toHaveBeenCalledWith(
          'districts',
          undefined,
          expect.objectContaining({ value: true }), // isSuperAdmin = true
          expect.objectContaining({ value: ['mock-org-id-3'] }) // Org filter still applied, but fetcher logic might ignore it for super admin
      );
  });


  it('should only enable the query once user claims are loaded', async () => {
    const mockClaimsData: Ref<UserClaims | undefined> = ref(undefined);
    const mockClaimsLoading = ref(true);

    mockUseUserClaimsQuery.mockReturnValue({ data: mockClaimsData, isLoading: mockClaimsLoading } as UseUserClaimsQueryReturn);

    withSetup(() => useDistrictsListQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Initial check: Query should be disabled
    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts-list'],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false,
      }),
    });

    expect(mockOrgFetcher).not.toHaveBeenCalled();

    // Simulate claims loading completion
    mockClaimsData.value = mockSuperAdminUserClaims.value; // Assign claims data
    mockClaimsLoading.value = false;
    await nextTick(); // Wait for reactivity

    // Check if the enabled computed property updates and triggers the fetch
    // This depends on how vue-query handles computed 'enabled'.
    // We expect orgFetcher to be called now.
    expect(mockOrgFetcher).toHaveBeenCalledWith(
      'districts',
      undefined,
      expect.objectContaining({ value: true }), // Super admin claims loaded
      expect.objectContaining({ value: ['mock-org-id-3'] })
    );
  });

  it('should allow the query to be disabled via the passed query options, overriding claims loading', () => {
    // Use UseQueryOptions<OrgData[], Error> based on linter feedback
    const queryOptions: Partial<UseQueryOptions<OrgData[], Error>> = { 
        enabled: false 
    };
    // Even if claims are loaded, the external option should disable it
    mockUseUserClaimsQuery.mockReturnValue({ data: mockUserClaims, isLoading: ref(false) } as UseUserClaimsQueryReturn);

    withSetup(() => useDistrictsListQuery(queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['districts-list'],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        value: false, // Should be false due to queryOptions
      }),
    });

    expect(mockOrgFetcher).not.toHaveBeenCalled();
  });
}); 