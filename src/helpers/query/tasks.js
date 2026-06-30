import { toValue } from 'vue';
import { tasksRepository } from '@/firebase/repositories/TasksRepository';

export const taskFetcher = async (registered = true, siteId) => {
  return tasksRepository.getTasks({ siteId, registered });
};

/**
 * Fetch task documents by their IDs.
 *
 * @param {Array<String>} taskIds – The array of task IDs to fetch.
 * @param {String} siteId – The current site ID.
 * @returns {Promise<Array<Object>>} The array of task documents.
 */
export const fetchByTaskId = async (taskIds, siteId) => {
  return tasksRepository.getTasks({ siteId, taskIds: toValue(taskIds) });
};
