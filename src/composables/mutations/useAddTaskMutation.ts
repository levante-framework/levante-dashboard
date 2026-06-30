import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType } from '@tanstack/vue-query';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_ADD_MUTATION_KEY } from '@/constants/mutationKeys';
import type { UpsertTaskPayload } from '@/types/task';

const useAddTaskMutation = (): UseMutationReturnType<void, Error, UpsertTaskPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TASK_ADD_MUTATION_KEY,
    mutationFn: async (task: UpsertTaskPayload): Promise<void> => {
      await tasksRepository.upsertTask(task);
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
};

export default useAddTaskMutation;
