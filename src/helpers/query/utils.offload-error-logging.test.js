import axios from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import { fetchDocsById, fetchDocumentsById, fetchSubcollection } from './utils';

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('axios', () => {
  const post = vi.fn();
  const get = vi.fn();
  return {
    default: {
      create: vi.fn(() => ({ post, get })),
      __mockPost: post,
      __mockGet: get,
    },
  };
});

describe('Axios helpers offload error logging', () => {
  let mockPost;
  let mockGet;

  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.roarfirekit = {
      roarConfig: { admin: { projectId: 'test-project' } },
      restConfig: {
        admin: { headers: { Authorization: 'Bearer test' } },
      },
    };

    mockPost = axios.__mockPost;
    mockGet = axios.__mockGet;
    mockPost.mockReset();
    mockGet.mockReset();
    vi.mocked(logger.error).mockClear();
  });

  it('fetchDocumentsById throws on Axios failure without logging', async () => {
    const networkError = new Error('batchGet failed');
    mockPost.mockRejectedValueOnce(networkError);

    await expect(fetchDocumentsById('districts', ['district-1'])).rejects.toThrow('batchGet failed');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fetchDocsById throws on Axios failure without logging', async () => {
    const networkError = new Error('get doc failed');
    mockGet.mockRejectedValueOnce(networkError);

    await expect(
      fetchDocsById([{ collection: 'tasks', docId: 'task-1' }]),
    ).rejects.toThrow('Failed to fetch documents by ID');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('fetchSubcollection throws on Axios failure without logging or error-object return', async () => {
    const networkError = Object.assign(new Error('subcollection failed'), {
      response: { status: 500 },
    });
    mockGet.mockRejectedValueOnce(networkError);

    await expect(fetchSubcollection('users/user-1', 'surveyResponses')).rejects.toThrow('subcollection failed');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
