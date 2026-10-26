import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import { LAUNCHER_PARAM_NAMES_QUERY_KEY } from '@/constants/queryKeys';
import { extractTaskLauncherParamNames, type TaskLauncherParamNames } from '@/helpers/extractTaskLauncherParams';

const SERVE_SOURCE_URL =
  'https://raw.githubusercontent.com/levante-framework/core-tasks/main/task-launcher/serve/serve.js';

const fetchLauncherParamNames = async (): Promise<TaskLauncherParamNames> => {
  const { data } = await axios.get<string>(SERVE_SOURCE_URL, { responseType: 'text' });
  return extractTaskLauncherParamNames(data);
};

const useLauncherParamNamesQuery = (): UseQueryReturnType<TaskLauncherParamNames, Error> =>
  useQuery({
    queryKey: [LAUNCHER_PARAM_NAMES_QUERY_KEY],
    queryFn: fetchLauncherParamNames,
    staleTime: 1000 * 60 * 60,
  });

export default useLauncherParamNamesQuery;
