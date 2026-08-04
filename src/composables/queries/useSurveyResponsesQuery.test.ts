import { createTestingPinia } from '@pinia/testing';
import type { QueryClient } from '@tanstack/vue-query';
import * as VueQuery from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { QueryOptionsWithEnabled } from '@/helpers/computeQueryOverrides';
import { fetchSubcollection } from '@/helpers/query/utils';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import { withSetup } from '@/test-support/withSetup.js';
import useSurveyResponsesQuery from './useSurveyResponsesQuery';

vi.mock('@/helpers/query/utils', () => ({
  fetchSubcollection: vi.fn().mockImplementation(() => []),
}));

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = (await getModule()) as typeof import('@tanstack/vue-query');
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useSurveyResponsesQuery', () => {
  let piniaInstance: ReturnType<typeof createTestingPinia>;
  let queryClient: QueryClient;

  beforeEach(() => {
    piniaInstance = createTestingPinia();
    queryClient = new VueQuery.QueryClient();
    vi.mocked(logger.error).mockClear();
    vi.mocked(fetchSubcollection).mockReset();
    vi.mocked(fetchSubcollection).mockImplementation(() => Promise.resolve([]));
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters', () => {
    const mockUserId = nanoid();

    const authStore = useAuthStore(piniaInstance);
    authStore.getUserId = () => mockUserId;

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useSurveyResponsesQuery(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses'],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: true,
        }),
      }),
    );

    expect(fetchSubcollection).toHaveBeenCalledWith(`users/${mockUserId}`, 'surveyResponses');
  });

  it('should correctly control the enabled state of the query', async () => {
    const mockUserId = nanoid();

    const authStore = useAuthStore(piniaInstance);
    authStore.getUserId = () => mockUserId;

    const enableQuery = ref(false);

    const queryOptions = {
      enabled: enableQuery,
    } as QueryOptionsWithEnabled;

    withSetup(() => useSurveyResponsesQuery(queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses'],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
          __v_isRef: true,
        }),
      }),
    );

    expect(fetchSubcollection).not.toHaveBeenCalled();

    enableQuery.value = true;
    await nextTick();

    expect(fetchSubcollection).toHaveBeenCalledWith(`users/${mockUserId}`, 'surveyResponses');
  });

  it('should only fetch data if the userId is available', async () => {
    const authStore = useAuthStore(piniaInstance);
    authStore.getUserId = () => undefined;

    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    withSetup(() => useSurveyResponsesQuery(queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses'],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
          __v_isRef: true,
        }),
      }),
    );

    expect(fetchSubcollection).not.toHaveBeenCalled();
  });

  it('should not let queryOptions override the internally computed value', async () => {
    const authStore = useAuthStore(piniaInstance);
    authStore.getUserId = () => undefined;

    const queryOptions = { enabled: true } as QueryOptionsWithEnabled;

    withSetup(() => useSurveyResponsesQuery(queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses'],
        queryFn: expect.any(Function),
        enabled: expect.objectContaining({
          _value: false,
          __v_isRef: true,
        }),
      }),
    );

    expect(fetchSubcollection).not.toHaveBeenCalled();
  });

  it('propagates fetchSubcollection failures without logging in queryFn', async () => {
    const mockUserId = nanoid();
    const authStore = useAuthStore(piniaInstance);
    authStore.getUserId = () => mockUserId;

    const networkError = new Error('subcollection failed');
    vi.mocked(fetchSubcollection).mockRejectedValueOnce(networkError);

    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useSurveyResponsesQuery({ enabled: false } as QueryOptionsWithEnabled), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const lastCallArgs = vi.mocked(VueQuery.useQuery).mock.calls.at(-1)?.[0] as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(lastCallArgs.queryFn()).rejects.toThrow('subcollection failed');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
