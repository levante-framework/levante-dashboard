// TODO: improve test coverage for this file

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { ORG_TYPES } from '@/constants/orgTypes';
import { fetchDocById, fetchDocumentsById } from '@/helpers/query/utils';
import { logger } from '@/logger';
import { orgFetchAll } from './orgs';

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/helpers/query/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchDocById: vi.fn(),
    fetchDocumentsById: vi.fn(),
  };
});

describe('orgFetchAll creator fetch offload (site-admin USERS permission scenario)', () => {
  beforeEach(() => {
    vi.mocked(fetchDocById).mockReset();
    vi.mocked(fetchDocumentsById).mockReset();
    vi.mocked(logger.error).mockClear();
  });

  it('swallows USERS fetch failures without logging and keeps org results', async () => {
    vi.mocked(fetchDocById).mockResolvedValueOnce({
      id: 'site-1',
      name: 'ai-tests',
      createdBy: 'super-admin-uid',
    });
    vi.mocked(fetchDocumentsById).mockRejectedValueOnce(
      Object.assign(new Error('Missing or insufficient permissions.'), { response: { status: 403 } }),
    );

    const orgs = await orgFetchAll(
      ref(ORG_TYPES.DISTRICTS),
      ref('site-1'),
      ref(null),
      ref(undefined),
      ['id', 'name', 'tags', 'createdBy'],
      true,
    );

    expect(fetchDocumentsById).toHaveBeenCalledWith('users', ['super-admin-uid'], ['displayName', 'name']);
    expect(logger.error).not.toHaveBeenCalled();
    expect(orgs).toEqual([
      {
        id: 'site-1',
        name: 'ai-tests',
        createdBy: 'super-admin-uid',
        creatorName: 'Unknown User',
      },
    ]);
  });
});
