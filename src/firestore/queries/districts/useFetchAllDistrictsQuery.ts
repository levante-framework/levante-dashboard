import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { DISTRICTS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { convertValues, getAxiosInstance, getBaseDocumentPath, orderByDefault } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import { UseQueriesOptions, useQuery } from '@tanstack/vue-query';
import _mapValues from 'lodash/mapValues';

const getStructuredQuery = ({ collection, orderBy = orderByDefault }) => {
  const structuredQuery: any = {
    from: [{ collectionId: collection }],
    orderBy,
  };

  return structuredQuery;
};

const fetchAllDistricts = async () => {
  const axios = getAxiosInstance();
  const documentPath = getBaseDocumentPath();
  const collection = FIRESTORE_COLLECTIONS.DISTRICTS;
  const structuredQuery = getStructuredQuery({ collection });

  try {
    const response = await axios.post(`${documentPath}:runQuery`, { structuredQuery });

    return response?.data
      ?.filter((row: any) => row.document)
      ?.map((row: any) => {
        const pathParts = row.document.name.split('/');
        const documentId = pathParts.pop();
        const collectionName = pathParts.pop();
        return {
          id: documentId,
          collection: collectionName,
          ..._mapValues(row.document.fields, (value) => convertValues(value)),
        };
      });
  } catch (error) {
    console.error('Error fetching all districts', error);
    return [];
  }
};

const useFetchAllDistrictsQuery = (queryOptions?: UseQueriesOptions<any>) => {
  const authStore = useAuthStore();
  const { isUserSuperAdmin } = authStore;
  const queryConditions = [() => isUserSuperAdmin()];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [DISTRICTS_QUERY_KEY],
    queryFn: () => fetchAllDistricts(),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useFetchAllDistrictsQuery;
