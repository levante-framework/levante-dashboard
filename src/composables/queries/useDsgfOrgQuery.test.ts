import { createTestingPinia } from '@pinia/testing';
import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { fetchTreeOrgs } from '@/helpers/query/orgs';
import { useAuthStore } from '@/store/auth';
import { withSetup } from '@/test-support/withSetup.js';
import useDsgfOrgQuery from './useDsgfOrgQuery';

vi.mock('@/helpers/query/orgs', () => ({
  fetchTreeOrgs: vi.fn().mockImplementation(() => []),
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useDsgfOrgQuery', () => {
  let piniaInstance: ReturnType<typeof createTestingPinia>;
  let queryClient: QueryClient;

  beforeEach(() => {
    piniaInstance = createTestingPinia();
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockUserId = nanoid();
    const mockAdministrationId = nanoid();
    const mockAssignedOrgs = [nanoid()];

    const authStore = useAuthStore(piniaInstance);
    authStore.uid = mockUserId;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['dsgf-orgs', mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: true,
      }),
    });

    expect(fetchTreeOrgs).toHaveBeenCalledWith(mockAdministrationId, mockAssignedOrgs);
  });

  it('should correctly control the enabled state of the query', async () => {
    const mockUserId = nanoid();
    const mockAdministrationId = nanoid();
    const mockAssignedOrgs = [nanoid()];

    const authStore = useAuthStore(piniaInstance);
    authStore.uid = mockUserId;

    const enableQuery = ref(false);

    const queryOptions = {
      enabled: enableQuery,
    };

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['dsgf-orgs', mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
        __v_isRef: true,
      }),
    });

    expect(fetchTreeOrgs).not.toHaveBeenCalled();

    enableQuery.value = true;
    await nextTick();

    expect(fetchTreeOrgs).toHaveBeenCalledWith(mockAdministrationId, mockAssignedOrgs);
  });

  it('should only fetch data if the administration ID is available', async () => {
    const mockAdministrationId = ref();
    const mockAssignedOrgs = [nanoid()];

    const queryOptions = { enabled: true };

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['dsgf-orgs', mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
        __v_isRef: true,
      }),
    });

    expect(fetchTreeOrgs).not.toHaveBeenCalled();

    mockAdministrationId.value = nanoid();
    await nextTick();

    expect(fetchTreeOrgs).toHaveBeenCalledWith(mockAdministrationId, mockAssignedOrgs);
  });

  it('should not let queryOptions override the internally computed value', async () => {
    const mockAdministrationId = null;
    const mockAssignedOrgs = [nanoid()];

    const queryOptions = { enabled: true };

    withSetup(() => useDsgfOrgQuery(mockAdministrationId, mockAssignedOrgs, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['dsgf-orgs', mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
        __v_isRef: true,
      }),
    });

    expect(fetchTreeOrgs).not.toHaveBeenCalled();
  });
});
