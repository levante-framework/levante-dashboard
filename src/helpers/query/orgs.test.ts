import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { ORG_TYPES } from '@/constants/orgTypes';
import { fetchDocumentsById, getAxiosInstance, orderByDefault } from '@/helpers/query/utils';
import { orgFetchAll } from './orgs';

const mockPost = vi.fn();

vi.mock('@/helpers/query/utils', async (getModule) => {
  const original = await getModule<typeof import('@/helpers/query/utils')>();
  return {
    ...original,
    getAxiosInstance: vi.fn(),
    getBaseDocumentPath: vi.fn(() => 'projects/mock-project/databases/(default)/documents'),
    fetchDocumentsById: vi.fn(),
  };
});

const withStatus = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });

const cohortResponse = {
  data: [
    {
      document: {
        name: 'projects/mock-project/databases/(default)/documents/groups/mock-cohort-id',
        fields: {
          name: { stringValue: 'Irony Study' },
          createdBy: { stringValue: 'mock-creator-id' },
        },
      },
    },
  ],
};

const fetchAllCohorts = (includeCreators = false) =>
  orgFetchAll(
    ref(ORG_TYPES.GROUPS),
    ref('mock-site-id'),
    ref(undefined),
    ref(orderByDefault),
    ['id', 'name', 'createdBy'],
    includeCreators,
    'mock-user-id',
  );

describe('orgFetchAll', () => {
  beforeEach(() => {
    vi.mocked(getAxiosInstance).mockReturnValue({ post: mockPost } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the fetched orgs', async () => {
    mockPost.mockResolvedValue(cohortResponse);

    await expect(fetchAllCohorts()).resolves.toEqual([
      expect.objectContaining({ id: 'mock-cohort-id', name: 'Irony Study' }),
    ]);
  });

  // Swallowing a rejected read renders an expired session as an empty collection, which is what made
  // a site admin's existing cohort look deleted.
  it.each([401, 403])('rethrows %i responses rather than returning an empty list', async (status) => {
    mockPost.mockRejectedValue(withStatus(status));

    await expect(fetchAllCohorts()).rejects.toThrow(`status code ${status}`);
  });

  it('still degrades to an empty list for non-auth failures', async () => {
    mockPost.mockRejectedValue(withStatus(500));

    await expect(fetchAllCohorts()).resolves.toEqual([]);
  });

  it('keeps the org list when the creator lookup is rejected', async () => {
    mockPost.mockResolvedValue(cohortResponse);
    vi.mocked(fetchDocumentsById).mockRejectedValue(withStatus(403));

    await expect(fetchAllCohorts(true)).resolves.toEqual([
      expect.objectContaining({ id: 'mock-cohort-id', creatorName: 'Unknown User' }),
    ]);
  });
});
