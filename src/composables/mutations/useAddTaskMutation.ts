import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseMutationReturnType, QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import { TASKS_QUERY_KEY } from '@/constants/queryKeys';
import { TASK_ADD_MUTATION_KEY } from '@/constants/mutationKeys';

// Define the structure for the task object payload
// Based on src/components/tasks/ManageTasks.vue handleNewTaskSubmit
interface NewTaskPayload {
  taskId: string;
  taskName?: string;
  description?: string; // Changed from taskDescription in ManageTasks
  coverImage?: string;  // Changed from taskImage in ManageTasks
  gameConfig?: Record<string, any>;
  taskParams?: Record<string, any> | null;
  demoData?: boolean;
  testData?: boolean;
  registered?: boolean;
  external?: boolean;
  taskURL?: string; // Only present if external is true
  [key: string]: any; // Allow other properties
}

/**
 * Add Task mutation.
 *
 * TanStack mutation to add a task and automatically invalidate the corresponding queries.
 * @returns The mutation object returned by `useMutation`.
 */
const useAddTaskMutation = (): UseMutationReturnType<void, Error, NewTaskPayload, unknown> => {
  const authStore = useAuthStore();
  const queryClient: QueryClient = useQueryClient();

  return useMutation<void, Error, NewTaskPayload, unknown>({
    mutationKey: [TASK_ADD_MUTATION_KEY],
    mutationFn: async (task: NewTaskPayload): Promise<void> => {
       // Check if roarfirekit is initialized before attempting to use it.
       if (!authStore.isFirekitInit || !authStore.roarfirekit) {
         throw new Error('Roarfirekit is not initialized. Cannot add task.');
       }
       // Assuming registerTaskVariant is async and returns void or Promise<void>
      await authStore.roarfirekit.registerTaskVariant({ ...task });
    },
    onSuccess: () => {
      // Invalidate the tasks query upon successful addition
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
    onError: (error: Error, variables: NewTaskPayload) => {
        // Add more specific error logging if possible
        console.error(`Error adding task with ID ${variables.taskId}:`, error);
    }
    // Consider adding retry logic if appropriate
  });
};

export default useAddTaskMutation; 