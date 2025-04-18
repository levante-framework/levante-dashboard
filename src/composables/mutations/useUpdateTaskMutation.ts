import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_UPDATE_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure for the task update data
// Based on updatePayload in src/components/tasks/ManageTasks.vue
interface TaskUpdateData {
    // Include known fields from the Task interface used in ManageTasks
    taskName?: string;
    taskURL?: string;
    coverImage?: string;
    description?: string;
    gameConfig?: Record<string, any>;
    taskParams?: Record<string, any> | null;
    external?: boolean;
    demoData?: boolean;
    testData?: boolean;
    registered?: boolean;
    [key: string]: any; // Allow other potential fields being updated
}

// Define the structure for the mutation variables
interface UpdateTaskPayload {
    taskId: string;         // The ID of the task to update
    data: TaskUpdateData;   // The data object containing fields to update
}

/**
 * Update Task mutation.
 *
 * TanStack mutation to update a task and automatically invalidate the corresponding queries.
 * @returns The mutation object returned by `useMutation`.
 */
const useUpdateTaskMutation = (): UseMutationReturnType<void, Error, UpdateTaskPayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, UpdateTaskPayload, unknown>({
    mutationKey: [TASK_UPDATE_MUTATION_KEY], // Wrap key in array
    mutationFn: async (taskPayload: UpdateTaskPayload): Promise<void> => {
        if (!authStore.isFirekitInit || !authStore.roarfirekit) {
            throw new Error('Roarfirekit is not initialized. Cannot update task.');
        }
        // Assuming updateTaskOrVariant handles this payload structure
      await authStore.roarfirekit.updateTaskOrVariant(taskPayload);
    },
    onSuccess: () => {
      // Invalidate the tasks query upon successful update
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
    onError: (error: Error, variables: UpdateTaskPayload) => {
        console.error(`Error updating task with ID ${variables.taskId}:`, error);
    }
    // Consider adding retry logic
  });
};

export default useUpdateTaskMutation; 