import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions, 
} from '@tanstack/vue-query';
import { withSetup } from '@/test-support/withSetup';
import { orgFetcher } from '@/helpers/query/orgs';
import useGroupsListQuery from './useGroupsListQuery';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';

// --- Mocks ---
const mockOrgFetcher = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/orgs', () => ({
  orgFetcher: mockOrgFetcher,
}));

const mockUseUserClaimsQuery = vi.fn();
vi.mock('@/composables/queries/useUserClaimsQuery', () => ({
  default: mockUseUserClaimsQuery,
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  // Simplify the mock: Only return the useQuery mock
  // This assumes other exports from vue-query aren't strictly needed by the composable/test setup
  // We might need to add back specific exports like QueryClient if they are used directly.
  mockUseQuery.mockImplementation(() => ({ 
    // Provide a default mock return structure for useQuery if needed by tests
    data: ref(null), 
    isLoading: ref(false), 
    isError: ref(false), 
    error: ref(null) 
  })); 
  return {
    // ...original, // Remove spreading original module
    useQuery: mockUseQuery,
    // Explicitly re-export anything else needed, e.g.:
    QueryClient: (await importOriginal<typeof import('@tanstack/vue-query')>()).QueryClient,
    VueQueryPlugin: (await importOriginal<typeof import('@tanstack/vue-query')>()).VueQueryPlugin,
  };
});

// --- Types ---
// Placeholder type for the data returned by the query
interface Group {
  id: string;
  name?: string;
  // Add other relevant properties if known
}

// Reusing UserClaims types from previous conversions
interface UserClaims {
  claims: {
    minimalAdminOrgs?: string[];
    super_admin?: boolean;
  };
}

interface UseUserClaimsQueryReturn {
  data: Ref<UserClaims | undefined>;
  isLoading?: Ref<boolean>;
}

// --- Tests ---
describe('useGroupsListQuery', () => {
  let queryClient: QueryClient;

  // Default mock claims for tests
  const mockUserClaimsData: Ref<UserClaims> = ref({
    claims: {
      minimalAdminOrgs: ['mock-org-id-1', 'mock-org-id-2'],
      super_admin: true, // Assuming super admin for simplicity unless test overrides
    },
  });

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters when claims are loaded', () => {
    mockUseUserClaimsQuery.mockReturnValue({ 
        data: mockUserClaimsData, 
        isLoading: ref(false) 
    } as UseUserClaimsQueryReturn);

    withSetup(() => useGroupsListQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['groups-list'],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: true }), // Enabled because claims are loaded
    });

    // Verify orgFetcher called with correct parameters based on mock claims
    expect(mockOrgFetcher).toHaveBeenCalledWith(
      'groups',
      undefined,
      expect.objectContaining({ value: true }), // isSuperAdmin from mockUserClaimsData
      expect.objectContaining({ value: ['mock-org-id-1', 'mock-org-id-2'] }) // adminOrgIds from mockUserClaimsData
    );
  });

  it('should only enable query once user claims are available', async () => {
    const loadingClaimsData: Ref<UserClaims | undefined> = ref(undefined);
    const loadingClaims = ref(true);
    mockUseUserClaimsQuery.mockReturnValue({ 
        data: loadingClaimsData, 
        isLoading: loadingClaims 
    } as UseUserClaimsQueryReturn);

    withSetup(() => useGroupsListQuery(), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    // Initial check: Query should be disabled
    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['groups-list'],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }),
    });
    expect(mockOrgFetcher).not.toHaveBeenCalled();

    // Simulate claims loaded
    loadingClaimsData.value = mockUserClaimsData.value;
    loadingClaims.value = false;
    await nextTick();

    // Check if orgFetcher was called after claims loaded
    expect(mockOrgFetcher).toHaveBeenCalled(); 
  });

  it('should allow the query to be disabled via passed query options, overriding claims', () => {
    // Define the full options object including queryKey
    const options: UseQueryOptions<Group[], Error> = { 
      queryKey: ['groups-list'], // Add queryKey
      enabled: false 
    }; 
    
    // Provide loaded claims, but options should override
    mockUseUserClaimsQuery.mockReturnValue({ 
        data: mockUserClaimsData, 
        isLoading: ref(false) 
    } as UseUserClaimsQueryReturn);

    // Pass the full options object
    withSetup(() => useGroupsListQuery(options), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['groups-list'],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }), // Should be false due to queryOptions
    });
     expect(mockOrgFetcher).not.toHaveBeenCalled();
  });
}); 