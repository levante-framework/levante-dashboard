import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-support/withSetup.js';
import * as VueQuery from '@tanstack/vue-query';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import useUpdateTaskMutation from './useUpdateTaskMutation';

vi.mock('@/firebase/repositories/TasksRepository', () => ({
  tasksRepository: {
    upsertTask: vi.fn(),
  },
}));

vi.mock('@tanstack/vue-query', async (getModule) => {
  const original = await getModule();
  return {
    ...original,
    useQuery: vi.fn().mockImplementation(original.useQuery),
  };
});

describe('useUpdateTaskMutation', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    queryClient?.clear();
  });

  const mockTask = {
    name: 'Mock Test Task',
    id: 'mock-test-task',
    description: '',
    image: '',
    taskUrl: '',
    userTypes: ['student'],
    registered: true,
  };

  it('should call upsertTask when the mutation is triggered', async () => {
    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync } = result;
    await mutateAsync(mockTask);

    expect(tasksRepository.upsertTask).toHaveBeenCalledWith(mockTask);
  });

  it('should invalidate task queries upon mutation success', async () => {
    const mockInvalidateQueries = vi.fn();

    vi.spyOn(VueQuery, 'useQueryClient').mockImplementation(() => ({
      invalidateQueries: mockInvalidateQueries,
    }));

    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync, isSuccess } = result;
    await mutateAsync(mockTask);

    expect(isSuccess.value).toBe(true);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });

  it('should not invalidate task queries upon mutation failure', async () => {
    const mockInvalidateQueries = vi.fn();
    const mockError = new Error('Mock error');
    tasksRepository.upsertTask.mockRejectedValueOnce(mockError);

    vi.spyOn(VueQuery, 'useQueryClient').mockImplementation(() => ({
      invalidateQueries: mockInvalidateQueries,
    }));

    const [result] = withSetup(() => useUpdateTaskMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const { mutateAsync, isSuccess, isError } = result;

    try {
      await mutateAsync(mockTask);
    } catch (error) {
      expect(error).toBe(mockError);
      expect(isSuccess.value).toBe(false);
      expect(isError.value).toBe(true);
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    }
  });
});
