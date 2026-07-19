import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { fetchDocById } from '@/helpers/query/utils';
import { withSetup } from '@/test-support/withSetup.js';
import useUserAdministrationAssignmentsQuery from './useUserAdministrationAssignmentsQuery';

vi.mock('@/helpers/query/utils', () => ({
  fetchDocById: vi.fn().mockImplementation(() => []),
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useUserAdministrationAssignmentsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockUserId = nanoid();
    const mockAdministrationId = nanoid();

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useUserAdministrationAssignmentsQuery(mockUserId, mockAdministrationId), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['user-administration-assignments', mockUserId, mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: true,
      }),
    });

    expect(fetchDocById).toHaveBeenCalledWith('users', `${mockUserId}/assignments/${mockAdministrationId}`);
  });

  it('should correctly control the enabled state of the query', async () => {
    const mockUserId = nanoid();
    const mockAdministrationId = nanoid();

    const enableQuery = ref(false);

    vi.spyOn(VueQuery, 'useQuery');

    const queryOptions = {
      enabled: enableQuery,
    };

    withSetup(() => useUserAdministrationAssignmentsQuery(mockUserId, mockAdministrationId, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['user-administration-assignments', mockUserId, mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
        __v_isRef: true,
      }),
    });

    expect(fetchDocById).not.toHaveBeenCalled();

    enableQuery.value = true;
    await nextTick();

    expect(fetchDocById).toHaveBeenCalledWith('users', `${mockUserId}/assignments/${mockAdministrationId}`);
  });

  it('should only fetch data if the params are set', async () => {
    const mockUserId = ref(null);
    const mockAdministrationId = ref(null);

    const queryOptions = { enabled: true };

    withSetup(() => useUserAdministrationAssignmentsQuery(mockUserId, mockAdministrationId, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['user-administration-assignments', mockUserId, mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
        __v_isRef: true,
      }),
    });

    expect(fetchDocById).not.toHaveBeenCalled();

    mockUserId.value = nanoid();

    await nextTick();

    expect(fetchDocById).not.toHaveBeenCalled();

    mockAdministrationId.value = nanoid();

    await nextTick();

    expect(fetchDocById).toHaveBeenCalledWith('users', `${mockUserId.value}/assignments/${mockAdministrationId.value}`);
  });

  it('should not let queryOptions override the internally computed value', async () => {
    const mockUserId = ref(null);
    const mockAdministrationId = ref(nanoid());

    const queryOptions = { enabled: true };

    withSetup(() => useUserAdministrationAssignmentsQuery(mockUserId, mockAdministrationId, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: ['user-administration-assignments', mockUserId, mockAdministrationId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
        __v_isRef: true,
      }),
    });

    expect(fetchDocById).not.toHaveBeenCalled();
  });
});
