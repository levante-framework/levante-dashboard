import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import * as VueQuery from '@tanstack/vue-query';
import { type QueryClient } from '@tanstack/vue-query';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { ORG_NAME_QUERY_KEY } from '@/constants/queryKeys';
import { normalizeToLowercase } from '@/helpers';
import { getAxiosInstance, getBaseDocumentPath, mapFields } from '@/helpers/query/utils';
import { withSetup } from '@/test-support/withSetup.js';
import useOrgNameExistsQuery from './useOrgNameExistsQuery';

const mockCurrentSite = ref('district-1');

vi.mock('@/helpers', async (importOriginal) => {
  const original = (await importOriginal()) as typeof import('@/helpers');
  return {
    ...original,
    normalizeToLowercase: vi.fn(),
  };
});

vi.mock('@/helpers/query/utils', () => ({
  getAxiosInstance: vi.fn(),
  getBaseDocumentPath: vi.fn(),
  mapFields: vi.fn(),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({})),
}));

vi.mock('pinia', () => ({
  storeToRefs: vi.fn(() => ({ currentSite: mockCurrentSite })),
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = (await getModule()) as typeof import('@tanstack/vue-query');
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

const mockNormalizeToLowercase = vi.mocked(normalizeToLowercase);
const mockGetAxiosInstance = vi.mocked(getAxiosInstance);
const mockGetBaseDocumentPath = vi.mocked(getBaseDocumentPath);
const mockMapFields = vi.mocked(mapFields);

describe('useOrgNameExistsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
    mockCurrentSite.value = 'district-1';
  });

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it('queries for a matching org name and returns true when found', async () => {
    const axiosInstance = {
      post: vi.fn().mockResolvedValue({ data: [{ document: {} }] }),
    } as any;
    const orgName = ref('North Middle School');
    const orgType = ref({ firestoreCollection: 'schools' });

    mockNormalizeToLowercase.mockReturnValue('north middle school');
    mockGetAxiosInstance.mockReturnValue(axiosInstance);
    mockGetBaseDocumentPath.mockReturnValue('projects/demo/databases/(default)/documents');
    mockMapFields.mockReturnValue([{}]);
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useOrgNameExistsQuery({ orgName, orgType }), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const queryCall = vi.mocked(VueQuery.useQuery).mock.calls[0]?.[0] as unknown as {
      queryFn: () => Promise<boolean>;
    };
    const result = await queryCall.queryFn();

    expect(result).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith('projects/demo/databases/(default)/documents:runQuery', {
      structuredQuery: {
        from: [{ collectionId: FIRESTORE_COLLECTIONS.SCHOOLS }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'normalizedName' },
                  op: 'EQUAL',
                  value: { stringValue: 'north middle school' },
                },
              },
              {
                compositeFilter: {
                  op: 'OR',
                  filters: [
                    {
                      fieldFilter: {
                        field: { fieldPath: 'siteId' },
                        op: 'EQUAL',
                        value: { stringValue: 'district-1' },
                      },
                    },
                    {
                      fieldFilter: {
                        field: { fieldPath: 'districtId' },
                        op: 'EQUAL',
                        value: { stringValue: 'district-1' },
                      },
                    },
                    {
                      fieldFilter: {
                        field: { fieldPath: 'parentOrgId' },
                        op: 'EQUAL',
                        value: { stringValue: 'district-1' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        limit: 1,
      },
    });
  });

  it('returns false when the request fails', async () => {
    const axiosInstance = {
      post: vi.fn().mockRejectedValue(new Error('request failed')),
    } as any;
    const orgName = ref('South School');
    const orgType = ref({ firestoreCollection: 'schools' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockNormalizeToLowercase.mockReturnValue('south school');
    mockGetAxiosInstance.mockReturnValue(axiosInstance);
    mockGetBaseDocumentPath.mockReturnValue('projects/demo/databases/(default)/documents');
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useOrgNameExistsQuery({ orgName, orgType }), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const queryCall = vi.mocked(VueQuery.useQuery).mock.calls[0]?.[0] as unknown as {
      queryFn: () => Promise<boolean>;
    };
    const result = await queryCall.queryFn();

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('Error fetching org by name', expect.any(Error));
  });

  it('returns false when org type is missing', async () => {
    const axiosInstance = {
      post: vi.fn(),
    } as any;
    const orgName = ref('West School');
    const orgType = ref({});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockNormalizeToLowercase.mockReturnValue('west school');
    mockGetAxiosInstance.mockReturnValue(axiosInstance);
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useOrgNameExistsQuery({ orgName, orgType }), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const queryCall = vi.mocked(VueQuery.useQuery).mock.calls[0]?.[0] as unknown as {
      queryFn: () => Promise<boolean>;
    };
    const result = await queryCall.queryFn();

    expect(result).toBe(false);
    expect(axiosInstance.post).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('orgNameExists: could not read org type');
  });

  it('disables the query when orgName is empty', () => {
    const orgName = ref('');
    const orgType = ref({ firestoreCollection: 'schools' });
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(() => useOrgNameExistsQuery({ orgName, orgType }), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: [ORG_NAME_QUERY_KEY, mockCurrentSite, orgType, orgName],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
      }),
    });
  });

  it('keeps options while disabling the query', () => {
    const orgName = ref('East School');
    const orgType = ref({ firestoreCollection: 'schools' });
    vi.spyOn(VueQuery, 'useQuery');

    withSetup(
      () =>
        useOrgNameExistsQuery({
          orgName,
          orgType,
          queryOptions: { enabled: false, staleTime: 120000 },
        }),
      {
        plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
      },
    );

    expect(VueQuery.useQuery).toHaveBeenCalledWith({
      queryKey: [ORG_NAME_QUERY_KEY, mockCurrentSite, orgType, orgName],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({
        _value: false,
      }),
      staleTime: 120000,
    });
  });
});
