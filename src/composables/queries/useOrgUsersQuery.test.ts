import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { withSetup } from '@/test-support/withSetup.js';
import * as VueQuery from '@tanstack/vue-query';
import { type QueryClient } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { type RoarFirekit } from '@levante-framework/firekit';
import { nanoid } from 'nanoid';
import { useAuthStore } from '@/store/auth';
import useOrgUsersQuery from './useOrgUsersQuery';

vi.mock('@tanstack/vue-query', async () => {
  const original = await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query');
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useOrgUsersQuery', () => {
  let piniaInstance: ReturnType<typeof createTestingPinia>;
  let queryClient: QueryClient;
  let getOrgUsers: Mock;

  beforeEach(() => {
    piniaInstance = createTestingPinia();
    queryClient = new VueQuery.QueryClient();
    getOrgUsers = vi.fn().mockResolvedValue({ users: [{ name: 'mock-user' }] });

    const authStore = useAuthStore(piniaInstance);
    authStore.roarfirekit = { getOrgUsers } as unknown as RoarFirekit;
  });

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it('should call query with correct parameters', async () => {
    const mockOrgType = 'org';
    const mockOrgId = nanoid();
    const mockPageNumber = 1;
    const mockOrderBy = 'name';
    const queryOptions = { enabled: true } as Parameters<typeof useOrgUsersQuery>[4];

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useOrgUsersQuery(mockOrgType, mockOrgId, mockPageNumber, mockOrderBy, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['org-users', mockOrgType, mockOrgId, mockPageNumber, mockOrderBy],
      queryFn: expect.any(Function),
      enabled: true,
    });

    await flushPromises();

    expect(getOrgUsers).toHaveBeenCalledWith({
      orgType: mockOrgType,
      orgId: mockOrgId,
      itemsPerPage: 1000000,
      page: mockPageNumber,
      orderBy: mockOrderBy,
    });
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockOrgType = 'org';
    const mockOrgId = nanoid();
    const mockPageNumber = 1;
    const mockOrderBy = 'name';
    const queryOptions = { enabled: false } as Parameters<typeof useOrgUsersQuery>[4];

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useOrgUsersQuery(mockOrgType, mockOrgId, mockPageNumber, mockOrderBy, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['org-users', mockOrgType, mockOrgId, mockPageNumber, mockOrderBy],
      queryFn: expect.any(Function),
      enabled: false,
    });

    expect(getOrgUsers).not.toHaveBeenCalled();
  });
});
