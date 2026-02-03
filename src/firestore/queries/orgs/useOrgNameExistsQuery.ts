import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { ORG_NAME_QUERY_KEY } from '@/constants/queryKeys';
import { normalizeToLowercase } from '@/helpers';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { getAxiosInstance, getBaseDocumentPath, mapFields } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { MaybeRefOrGetter, toValue } from 'vue';

interface UseOrgNameExistsQueryParams {
  orgName: MaybeRefOrGetter;
  orgType: MaybeRefOrGetter;
  queryOptions?: any;
}

interface OrgNameExistsParams extends UseOrgNameExistsQueryParams {
  districtId: MaybeRefOrGetter;
}

const orgNameExists = async ({ districtId, orgName, orgType }: OrgNameExistsParams) => {
  const normalizedOrgName = normalizeToLowercase(toValue(orgName));
  const axios = getAxiosInstance();
  const documentPath = getBaseDocumentPath();

  const COLLECTION_MAP: Record<string, string> = {
    districts: FIRESTORE_COLLECTIONS.DISTRICTS,
    schools: FIRESTORE_COLLECTIONS.SCHOOLS,
    classes: FIRESTORE_COLLECTIONS.CLASSES,
    groups: FIRESTORE_COLLECTIONS.GROUPS,
  };

  const collection = COLLECTION_MAP[toValue(orgType)?.firestoreCollection ?? ''];

  if (!collection) {
    console.error('orgNameExists: could not read org type');
    return false;
  }

  const requestBody = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'normalizedName' },
                op: 'EQUAL',
                value: { stringValue: toValue(normalizedOrgName) },
              },
            },
            {
              compositeFilter: {
                op: 'OR',
                filters: [
                  {
                    fieldFilter: {
                      field: { fieldPath: 'siteId' },
                      op: 'EQUAL',
                      value: { stringValue: toValue(districtId) },
                    },
                  },
                  {
                    fieldFilter: {
                      field: { fieldPath: 'districtId' },
                      op: 'EQUAL',
                      value: { stringValue: toValue(districtId) },
                    },
                  },
                  {
                    fieldFilter: {
                      field: { fieldPath: 'parentOrgId' },
                      op: 'EQUAL',
                      value: { stringValue: toValue(districtId) },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      limit: 1,
    },
  };

  try {
    const response = await axios.post(`${documentPath}:runQuery`, requestBody);
    const mappedData = mapFields(response?.data);
    return Array.isArray(mappedData) && mappedData?.length > 0;
  } catch (error) {
    console.error('Error fetching org by name', error);
    return false;
  }
};

const useOrgNameExistsQuery = ({ orgName, orgType, queryOptions }: UseOrgNameExistsQueryParams) => {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);
  const queryConditions = [
    () => !!toValue(currentSite)?.length,
    () => !!toValue(orgName)?.length,
    () => !!toValue(orgType)?.firestoreCollection?.length,
  ];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery({
    queryKey: [ORG_NAME_QUERY_KEY, currentSite, orgType, orgName],
    queryFn: () => orgNameExists({ districtId: currentSite, orgName, orgType }),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useOrgNameExistsQuery;
