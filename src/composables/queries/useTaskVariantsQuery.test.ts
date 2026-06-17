import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup.js';
import * as VueQuery from '@tanstack/vue-query';
import { type QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import useTaskVariantsQuery from './useTaskVariantsQuery';

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('pinia', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    storeToRefs: vi.fn((store) => ({
      currentSite: ref(store.currentSite),
    })),
  };
});

vi.mock('@/firebase/repositories/TasksRepository', () => ({
  tasksRepository: {
    getVariants: vi.fn().mockImplementation(() => []),
  },
}));

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof VueQuery>();
  return {
    ...original,
    useQuery: vi.fn(original.useQuery),
  };
});

describe('useTaskVariantsQuery', () => {
  let queryClient: QueryClient;
  const mockSiteId = 'mock-site-id';

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
    useAuthStore.mockReturnValue({
      currentSite: mockSiteId,
    });
    vi.mocked(tasksRepository.getVariants).mockClear();
    vi.mocked(VueQuery.useQuery).mockClear();
  });

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it('should call query with correct parameters', async () => {
    const fetchRegisteredVariants = false;
    const queryOptions = { enabled: true };

    withSetup(() => useTaskVariantsQuery(fetchRegisteredVariants, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await vi.waitFor(() => {
      expect(tasksRepository.getVariants).toHaveBeenCalledWith({
        siteId: mockSiteId,
        registeredVariantsOnly: false,
      });
    });

    expect(VueQuery.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.any(Object),
        queryFn: expect.any(Function),
        enabled: expect.any(Function),
      }),
    );
  });

  it('should set the alternate query key if fetching registered variants only', async () => {
    const fetchRegisteredVariants = true;
    const queryOptions = { enabled: true };

    withSetup(() => useTaskVariantsQuery(fetchRegisteredVariants, queryOptions), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await vi.waitFor(() => {
      expect(tasksRepository.getVariants).toHaveBeenCalledWith({
        siteId: mockSiteId,
        registeredVariantsOnly: true,
      });
    });
  });
});
