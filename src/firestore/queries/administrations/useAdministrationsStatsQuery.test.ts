import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import * as VueQuery from '@tanstack/vue-query';
import { type QueryClient } from '@tanstack/vue-query';
import { ADMINISTRATIONS_STATS_QUERY_KEY } from '@/constants/queryKeys';
import { withSetup } from '@/test-support/withSetup.js';
import { convertValues, getAxiosInstance, getBaseDocumentPath } from '@/helpers/query/utils';
import useAdministrationsStatsQuery, { readAdministrationsStats } from './useAdministrationsStatsQuery';

vi.mock('@/helpers/query/utils', () => ({
  convertValues: vi.fn(),
  getAxiosInstance: vi.fn(),
  getBaseDocumentPath: vi.fn(),
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = (await getModule()) as typeof import('@tanstack/vue-query');
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

const mockConvertValues = vi.mocked(convertValues);
const mockGetAxiosInstance = vi.mocked(getAxiosInstance);
const mockGetBaseDocumentPath = vi.mocked(getBaseDocumentPath);

describe('readAdministrationsStats', () => {
  beforeEach(() => {
    mockConvertValues.mockImplementation((value) => {
      if (value?.integerValue !== undefined) {
        return Number(value.integerValue);
      }
      return value;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array and warns when administrationIds is empty', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await readAdministrationsStats([]);

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('readAdministrationsStats (administrationIds) empty or not provided');
    expect(mockGetAxiosInstance).not.toHaveBeenCalled();
  });

  it('fetches and maps stats from the REST API', async () => {
    const axiosInstance = {
      post: vi.fn().mockResolvedValue({
        data: [
          {
            found: {
              name: 'projects/demo/databases/(default)/documents/administrations/admin-1/stats/total',
              fields: {
                completed: { integerValue: '3' },
                skipped: { integerValue: '1' },
              },
            },
          },
          {
            missing: 'projects/demo/databases/(default)/documents/administrations/admin-2/stats/total',
          },
        ],
      }),
    } as any;

    mockGetAxiosInstance.mockReturnValue(axiosInstance);
    mockGetBaseDocumentPath.mockReturnValue('projects/demo/databases/(default)/documents');

    const result = await readAdministrationsStats(['admin-1', 'admin-2']);

    expect(axiosInstance.post).toHaveBeenCalledWith('projects/demo/databases/(default)/documents:batchGet', {
      documents: [
        'projects/demo/databases/(default)/documents/administrations/admin-1/stats/total',
        'projects/demo/databases/(default)/documents/administrations/admin-2/stats/total',
      ],
    });
    expect(result).toEqual([
      {
        id: 'total',
        collection: 'stats',
        completed: 3,
        skipped: 1,
      },
    ]);
  });

  it('returns an empty array when the request fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const axiosInstance = {
      post: vi.fn().mockRejectedValue(new Error('request failed')),
    } as any;

    mockGetAxiosInstance.mockReturnValue(axiosInstance);
    mockGetBaseDocumentPath.mockReturnValue('projects/demo/databases/(default)/documents');

    const result = await readAdministrationsStats(['admin-1']);

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('Error fetching stats for administration', expect.any(Error));
  });
});

describe('useAdministrationsStatsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it('passes the sorted IDs and enabled state to useQuery', () => {
    const administrationIds = ref(['admin-3', 'admin-1', 'admin-2']);
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(
      () =>
        useAdministrationsStatsQuery({
          administrationIds: administrationIds.value,
        }),
      {
        plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
      },
    );

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: [ADMINISTRATIONS_STATS_QUERY_KEY, ['admin-1', 'admin-2', 'admin-3']],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: true,
      }),
    });
  });

  it('keeps options while disabling the query', () => {
    const administrationIds = ['admin-1'];
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(
      () =>
        useAdministrationsStatsQuery({
          administrationIds,
          queryOptions: { enabled: false, staleTime: 120000 },
        }),
      {
        plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
      },
    );

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: [ADMINISTRATIONS_STATS_QUERY_KEY, ['admin-1']],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
      }),
      staleTime: 120000,
    });
  });

  it('disables the query when administrationIds is empty', () => {
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(
      () =>
        useAdministrationsStatsQuery({
          administrationIds: [],
          queryOptions: { enabled: true },
        }),
      {
        plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
      },
    );

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: [ADMINISTRATIONS_STATS_QUERY_KEY, []],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
      }),
    });
  });
});
