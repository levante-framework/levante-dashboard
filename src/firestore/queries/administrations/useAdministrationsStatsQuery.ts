import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { ADMINISTRATIONS_STATS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { convertValues, getAxiosInstance, getBaseDocumentPath } from '@/helpers/query/utils';
import { UseQueriesOptions, useQuery } from '@tanstack/vue-query';
import _mapValues from 'lodash/mapValues';

interface UseAdministrationsStatsQueryParams {
  administrationIds: string[];
  queryOptions?: UseQueriesOptions<any>;
}

export const readAdministrationsStats = async (administrationIds: string[]) => {
  if (!administrationIds?.length) {
    console.warn('readAdministrationsStats (administrationIds) empty or not provided');
    return [];
  }

  const axios = getAxiosInstance();
  const documentPath = getBaseDocumentPath();
  const collection = FIRESTORE_COLLECTIONS.ADMINISTRATIONS;

  const documents = administrationIds?.map(
    (administrationId): string => `${documentPath}/${collection}/${administrationId}/stats/total`,
  );

  try {
    const response = await axios.post(`${documentPath}:batchGet`, {
      documents,
    });

    return response?.data
      ?.filter(({ found }: any) => found)
      ?.map(({ found }: any) => {
        const pathParts = found.name.split('/');
        const documentId = pathParts.pop();
        const collectionName = pathParts.pop();
        return {
          id: documentId,
          collection: collectionName,
          ..._mapValues(found.fields, (value) => convertValues(value)),
        };
      });
  } catch (error) {
    console.error('Error fetching stats for administration', error);
    return [];
  }
};

const useAdministrationsStatsQuery = ({ administrationIds, queryOptions }: UseAdministrationsStatsQueryParams) => {
  const sortedAdministrationIds = [...administrationIds].sort();
  const queryConditions = [() => !!sortedAdministrationIds?.length];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [ADMINISTRATIONS_STATS_QUERY_KEY, sortedAdministrationIds],
    queryFn: async () => await readAdministrationsStats(sortedAdministrationIds),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useAdministrationsStatsQuery;
