import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { withSetup } from '@/test-support/withSetup.js';
import useGetUsersByOrgQuery from './useGetUsersByOrgQuery';

vi.mock('@/firebase/repositories/UsersRepository', () => ({
  usersRepository: {
    getUsersByOrg: vi.fn(),
  },
}));

const getUsersByOrg = usersRepository.getUsersByOrg as unknown as Mock;

describe('useGetUsersByOrgQuery', () => {
  let queryClient: QueryClient;

  const mountQuery = (
    orgType: string,
    orgId: string,
    enabled?: Parameters<typeof useGetUsersByOrgQuery>[4],
  ): ReturnType<typeof useGetUsersByOrgQuery> => {
    const [result] = withSetup(() => useGetUsersByOrgQuery(orgType, orgId, 1, 'name', enabled), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getUsersByOrg.mockResolvedValue({ users: [{ uid: 'default' }] });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetches users for the given org and exposes the result', async () => {
    const orgId = nanoid();
    const result = { users: [{ uid: 'user-1' }, { uid: 'user-2' }] };
    getUsersByOrg.mockResolvedValueOnce(result);

    const { data, isSuccess } = mountQuery('site', orgId);
    await flushPromises();

    expect(getUsersByOrg).toHaveBeenCalledTimes(1);
    expect(getUsersByOrg).toHaveBeenCalledWith({ orgType: 'site', orgId });
    expect(isSuccess.value).toBe(true);
    expect(data.value).toEqual(result);
  });

  it.each([
    ['districts', 'site'],
    ['schools', 'school'],
    ['classes', 'class'],
    ['groups', 'cohort'],
  ])('translates the legacy org type %s to the backend %s', async (legacyOrgType, backendOrgType) => {
    const orgId = nanoid();
    mountQuery(legacyOrgType, orgId);
    await flushPromises();

    expect(getUsersByOrg).toHaveBeenCalledWith({ orgType: backendOrgType, orgId });
  });

  it('uses a query key scoped to the org type and id', async () => {
    const orgId = nanoid();
    mountQuery('school', orgId);
    await flushPromises();

    expect(queryClient.getQueryData(['org-users', 'school', orgId])).toEqual({ users: [{ uid: 'default' }] });
  });

  it('does not fetch when disabled via the enabled argument', async () => {
    mountQuery('site', nanoid(), false);
    await flushPromises();

    expect(getUsersByOrg).not.toHaveBeenCalled();
  });

  it('normalizes a rejected repository call into a FirebaseFailure and exposes no data', async () => {
    const boom = new Error('repository boom');
    getUsersByOrg.mockRejectedValueOnce(boom);

    const { isError, error, data } = mountQuery('site', nanoid());
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(error.value).toEqual({ code: 'error', error: boom });
    expect(data.value).toBeUndefined();
  });

  it('rejects an invalid orgType via schema validation without calling the repository', async () => {
    const { isError } = mountQuery('invalid-org', nanoid());
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(getUsersByOrg).not.toHaveBeenCalled();
  });
});
