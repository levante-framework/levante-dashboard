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
const mockUseQuery = vi.fn();

vi.mock('@/helpers/query/orgs', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/helpers/query/orgs')>();
  return {
    ...original,
    fetchTreeOrgs: mockFetchTreeOrgs,
  };
});

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), 
    isLoading: ref(false), 
    isFetching: ref(false),
    isError: ref(false), 
    error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    QueryClient: (await importOriginal<typeof import('@tanstack/vue-query')>()).QueryClient,
    VueQueryPlugin: (await importOriginal<typeof import('@tanstack/vue-query')>()).VueQueryPlugin,
  };
});

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

    expect(mockUseQuery).toHaveBeenCalledWith(
       expect.objectContaining({
         queryKey: ['dsgf-orgs', mockAdministrationId.value],
         enabled: expect.objectContaining({ value: true }),
       })
    );
  });

  it('should correctly control the enabled state of the query via queryOptions', async () => {
    const mockAdministrationId: Ref<string | null> = ref(nanoid());
    const mockAssignedOrgsData: AssignedOrgs = { schools: [nanoid()] };
    const mockAssignedOrgs: Ref<AssignedOrgs | null> = ref(mockAssignedOrgsData);

    const enableQuery = ref(false);
    const queryOptions: UseQueryOptions<OrgTree, Error> = { 
      queryKey: ['dsgf-orgs', mockAdministrationId.value],
      enabled: enableQuery 
    };

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dsgf-orgs', mockAdministrationId.value],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    enableQuery.value = true;
    await nextTick();
  });

  it('should only fetch data if the administration ID and assignedOrgs are available', async () => {
    const mockAdministrationId = ref<string | null>(null);
    const mockAssignedOrgs = ref<AssignedOrgs | null>(null);
    const queryOptions: UseQueryOptions<OrgTree, Error> = { 
        queryKey: ['dsgf-orgs', mockAdministrationId.value],
        enabled: true 
    };

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
       expect.objectContaining({
         queryKey: ['dsgf-orgs', null],
         enabled: expect.objectContaining({ value: false }),
       })
    );

    const newAdminId = nanoid();
    mockAdministrationId.value = newAdminId;
    await nextTick();

    const newAssignedOrgs: AssignedOrgs = { classes: [nanoid()] };
    mockAssignedOrgs.value = newAssignedOrgs;
    await nextTick();
  });

  it('should not let queryOptions override the internally computed enabled value', () => {
    const mockAdministrationId = ref<string | null>(null);
    const mockAssignedOrgs: Ref<AssignedOrgs | null> = ref({ groups: [nanoid()] });
    const queryOptions: UseQueryOptions<OrgTree, Error> = { 
      queryKey: ['dsgf-orgs', mockAdministrationId.value],
      enabled: true 
    };

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dsgf-orgs', null],
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });
}); 