import { ref, nextTick, type Ref, type MaybeRef } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { fetchTreeOrgs, type AssignedOrgs, type OrgTree } from '@/helpers/query/orgs';
import useDsgfOrgQuery from './useDsgfOrgQuery';

// --- Mocks ---
const mockFetchTreeOrgs = vi.fn().mockResolvedValue({ districts: [], schools: [], classes: [], groups: [], families: [] });
vi.mock('@/helpers/query/orgs', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/helpers/query/orgs')>();
  return {
    ...original,
    fetchTreeOrgs: mockFetchTreeOrgs,
  };
});

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(() => ({
    data: ref(null),
    isLoading: ref(false),
    isFetching: ref(false),
    isError: ref(false),
    error: ref(null),
  }));
  mockUseQuery.mockImplementation(original.useQuery);

  return {
    ...original,
    useQuery: mockUseQuery,
  };
});

// --- Types ---

// --- Tests ---
describe('useDsgfOrgQuery', () => {
  let piniaInstance: TestingPinia;
  let queryClient: QueryClient;
  const mockUserId: string = nanoid();

  beforeEach(async () => {
    piniaInstance = createTestingPinia({
      initialState: {
        auth: { uid: mockUserId },
      },
      createSpy: vi.fn,
    });
    queryClient = new QueryClient();
    vi.clearAllMocks();
    const originalVueQuery = await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query');
    mockUseQuery.mockImplementation(originalVueQuery.useQuery);
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockAdministrationId: Ref<string | null> = ref(nanoid());
    const mockAssignedOrgsData: AssignedOrgs = { districts: [nanoid()] };
    const mockAssignedOrgs: Ref<AssignedOrgs | null> = ref(mockAssignedOrgsData);

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['dsgf-orgs', mockAdministrationId.value]);
    expect(queryArgs.queryFn).toEqual(expect.any(Function));
    expect(queryArgs.enabled.value).toBe(true);

    queryArgs.queryFn();

    expect(mockFetchTreeOrgs).toHaveBeenCalledWith(
      mockAdministrationId.value,
      mockAssignedOrgs.value,
    );
  });

  it('should correctly control the enabled state of the query via queryOptions', async () => {
    const mockAdministrationId: Ref<string | null> = ref(nanoid());
    const mockAssignedOrgsData: AssignedOrgs = { schools: [nanoid()] };
    const mockAssignedOrgs: Ref<AssignedOrgs | null> = ref(mockAssignedOrgsData);

    const enableQuery = ref(false);
    const queryOptions = { enabled: enableQuery } as UseQueryOptions<OrgTree, Error>;

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['dsgf-orgs', mockAdministrationId.value]);
    expect(queryArgs.enabled.value).toBe(false);
    expect(mockFetchTreeOrgs).not.toHaveBeenCalled();

    enableQuery.value = true;
    await nextTick();

    expect(queryArgs.enabled.value).toBe(true);
    queryArgs.queryFn();

    expect(mockFetchTreeOrgs).toHaveBeenCalledWith(
      mockAdministrationId.value,
      mockAssignedOrgs.value,
    );
  });

  it('should only fetch data if the administration ID and assignedOrgs are available', async () => {
    const mockAdministrationId = ref<string | null>(null);
    const mockAssignedOrgs = ref<AssignedOrgs | null>(null);

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    let queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['dsgf-orgs', null]);
    expect(queryArgs.enabled.value).toBe(false);
    expect(mockFetchTreeOrgs).not.toHaveBeenCalled();

    const newAdminId = nanoid();
    mockAdministrationId.value = newAdminId;
    await nextTick();
    expect(queryArgs.queryKey).toEqual(['dsgf-orgs', newAdminId]);
    expect(queryArgs.enabled.value).toBe(false);
    expect(mockFetchTreeOrgs).not.toHaveBeenCalled();

    const newAssignedOrgs: AssignedOrgs = { classes: [nanoid()] };
    mockAssignedOrgs.value = newAssignedOrgs;
    await nextTick();
    expect(queryArgs.enabled.value).toBe(true);

    queryArgs.queryFn();

    expect(mockFetchTreeOrgs).toHaveBeenCalledWith(newAdminId, newAssignedOrgs);
  });

  it('should not let queryOptions override the internally computed enabled value', () => {
    const mockAdministrationId = ref<string | null>(null);
    const mockAssignedOrgs: Ref<AssignedOrgs | null> = ref({ groups: [nanoid()] });

    const queryOptions = { enabled: true } as UseQueryOptions<OrgTree, Error>;

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalled();
    const queryArgs = mockUseQuery.mock.calls[0][0];

    expect(queryArgs.queryKey).toEqual(['dsgf-orgs', null]);
    expect(queryArgs.enabled.value).toBe(false);
    expect(mockFetchTreeOrgs).not.toHaveBeenCalled();
  });
}); 