import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type MaybeRefOrGetter, ref } from 'vue';
import { surveyFormsRepository } from '@/firebase/repositories/SurveyFormsRepository';
import { withSetup } from '@/test-support/withSetup.js';
import { useGetOrgInformationStatusQuery } from './useGetOrgInformationStatusQuery';

vi.mock('@/firebase/repositories/SurveyFormsRepository', () => ({
  surveyFormsRepository: {
    getOrgInformationStatus: vi.fn(),
  },
}));

const getOrgInformationStatus = surveyFormsRepository.getOrgInformationStatus as unknown as Mock;

function completeResults(orgType: string, orgIds: string[]) {
  return { orgType, results: orgIds.map((orgId) => ({ orgId, progress: 'complete' })) };
}

describe('useGetOrgInformationStatusQuery', () => {
  let queryClient: QueryClient;

  const mountQuery = (
    orgType: Parameters<typeof useGetOrgInformationStatusQuery>[0],
    orgIds: Parameters<typeof useGetOrgInformationStatusQuery>[1],
    enabled?: MaybeRefOrGetter<boolean>,
  ): ReturnType<typeof useGetOrgInformationStatusQuery> => {
    const [result] = withSetup(() => useGetOrgInformationStatusQuery(orgType, orgIds, enabled), {
      plugins: [[VueQueryPlugin, { queryClient }]],
    });
    return result;
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getOrgInformationStatus.mockImplementation(async ({ orgType, orgIds }) => completeResults(orgType, orgIds));
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('calls the callable with orgType "site" for districts', async () => {
    const { data } = mountQuery('districts', ['site-1']);
    await flushPromises();

    expect(getOrgInformationStatus).toHaveBeenCalledWith({ orgType: 'site', orgIds: ['site-1'] });
    expect(data.value).toEqual({ orgType: 'site', results: [{ orgId: 'site-1', progress: 'complete' }] });
  });

  it('calls the callable with orgType "school" for schools', async () => {
    const { data } = mountQuery('schools', ['school-1', 'school-2']);
    await flushPromises();

    expect(getOrgInformationStatus).toHaveBeenCalledWith({ orgType: 'school', orgIds: ['school-1', 'school-2'] });
    expect(data.value?.orgType).toBe('school');
  });

  it('splits more than 100 orgIds into calls of at most 100 and merges the results in order', async () => {
    const orgIds = Array.from({ length: 250 }, (_, index) => `school-${index}`);

    const { data } = mountQuery('schools', orgIds);
    await flushPromises();

    expect(getOrgInformationStatus).toHaveBeenCalledTimes(3);
    expect(getOrgInformationStatus.mock.calls.map(([params]) => params.orgIds.length)).toEqual([100, 100, 50]);
    expect(data.value?.results.map((result) => result.orgId)).toEqual(orgIds);
  });

  it('waits for orgIds to be populated before fetching', async () => {
    const orgIds = ref<string[]>([]);
    const { data } = mountQuery('schools', orgIds);
    await flushPromises();

    expect(getOrgInformationStatus).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();

    orgIds.value = ['school-late'];
    await flushPromises();

    expect(getOrgInformationStatus).toHaveBeenCalledWith({ orgType: 'school', orgIds: ['school-late'] });
  });

  it('respects a reactive `enabled` argument', async () => {
    const enabled = ref(false);
    mountQuery('districts', ['site-1'], enabled);
    await flushPromises();

    expect(getOrgInformationStatus).not.toHaveBeenCalled();

    enabled.value = true;
    await flushPromises();

    expect(getOrgInformationStatus).toHaveBeenCalledTimes(1);
  });

  it('surfaces a rejected repository call as a FirebaseFailure', async () => {
    const error = new Error('status boom');
    getOrgInformationStatus.mockRejectedValueOnce(error);

    const { isError, error: queryError } = mountQuery('districts', ['site-1']);
    await flushPromises();

    expect(isError.value).toBe(true);
    expect(queryError.value).toEqual({ code: 'error', error });
  });
});
