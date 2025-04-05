import { toValue } from 'vue';
import _chunk from 'lodash/chunk';
import _last from 'lodash/last';
import _mapValues from 'lodash/mapValues';
import _without from 'lodash/without';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { convertValues, getAxiosInstance, orderByDefault } from './utils';
import { filterAdminOrgs } from '@/helpers';
import { Ref } from 'vue';

interface Administration {
  id: string;
  name: string;
  publicName?: string;
  dates: {
    start: string;
    end: string;
    created: string;
  };
  assessments: any[];
  assignedOrgs: {
    districts: string[];
    schools: string[];
    classes: string[];
    groups: string[];
    families: string[];
  };
  testData: boolean;
  stats?: {
    total: any;
  };
  [key: string]: any;
}

interface FoundDocument {
  name: string;
  fields: Record<string, any>;
}

interface BatchGetResponse {
  found?: FoundDocument;
}

interface StatsDocument {
  name: string;
  data: Record<string, any>;
}

interface AdminOrgs {
  districts: string[];
  schools: string[];
  classes: string[];
  groups: string[];
  families: string[];
  [key: string]: string[];
}

export function getTitle(item: Administration, isSuperAdmin: boolean): string {
  if (isSuperAdmin) {
    return item.name;
  } else {
    return item.publicName ?? item.name;
  }
}

const processBatchStats = async (
  axiosInstance: any,
  statsPaths: string[],
  batchSize = 5
): Promise<StatsDocument[]> => {
  const batchStatsDocs: StatsDocument[] = [];
  const statsPathChunks = _chunk(statsPaths, batchSize);
  
  for (const batch of statsPathChunks) {
    const { data } = await axiosInstance.post(':batchGet', {
      documents: batch,
    });

    const processedBatch = data
      .map(({ found }: BatchGetResponse) => {
        if (found) {
          return {
            name: found.name,
            data: _mapValues(found.fields, (value) => convertValues(value)),
          } as StatsDocument;
        }
        return undefined;
      })
      .filter((item: StatsDocument | undefined): item is StatsDocument => item !== undefined);

    batchStatsDocs.push(...processedBatch);
  }

  return batchStatsDocs;
};

const mapAdministrations = async ({
  isSuperAdmin,
  data,
  adminOrgs,
}: {
  isSuperAdmin: Ref<boolean>;
  data: Array<{ name: string; data: any }>;
  adminOrgs: Ref<AdminOrgs>;
}): Promise<Administration[]> => {
  const administrationData = data
    .map((a) => a.data)
    .map((a) => {
      const assignedOrgs: AdminOrgs = {
        districts: a.districts ?? [],
        schools: a.schools ?? [],
        classes: a.classes ?? [],
        groups: a.groups ?? [],
        families: a.families ?? [],
      };
      if (!isSuperAdmin.value) {
        const filteredOrgs = filterAdminOrgs(adminOrgs.value, assignedOrgs);
        return {
          id: a.id,
          name: a.name,
          publicName: a.publicName,
          dates: {
            start: a.dateOpened,
            end: a.dateClosed,
            created: a.dateCreated,
          },
          assessments: a.assessments,
          assignedOrgs: {
            districts: filteredOrgs.districts,
            schools: filteredOrgs.schools,
            classes: filteredOrgs.classes,
            groups: filteredOrgs.groups,
            families: filteredOrgs.families,
          },
          testData: a.testData ?? false,
        };
      }
      return {
        id: a.id,
        name: a.name,
        publicName: a.publicName,
        dates: {
          start: a.dateOpened,
          end: a.dateClosed,
          created: a.dateCreated,
        },
        assessments: a.assessments,
        assignedOrgs: {
          districts: assignedOrgs.districts,
          schools: assignedOrgs.schools,
          classes: assignedOrgs.classes,
          groups: assignedOrgs.groups,
          families: assignedOrgs.families,
        },
        testData: a.testData ?? false,
      };
    });

  const statsPaths = data
    .filter((item) => item.name !== undefined)
    .map(({ name }) => `${name}/stats/total`);

  const axiosInstance = getAxiosInstance();
  const batchStatsDocs = await processBatchStats(axiosInstance, statsPaths);

  return administrationData.map((administration) => {
    const thisAdminStats = batchStatsDocs.find((statsDoc) =>
      statsDoc.name.includes(administration.id)
    );
    return {
      ...administration,
      stats: { total: thisAdminStats?.data },
    };
  });
};

export const administrationPageFetcher = async (
  isSuperAdmin: Ref<boolean>,
  exhaustiveAdminOrgs: Ref<AdminOrgs>,
  fetchTestData = false,
  orderBy?: Ref<any>
): Promise<Administration[]> => {
  console.log('Fetching administrations with params:', {
    isSuperAdmin: toValue(isSuperAdmin),
    exhaustiveAdminOrgs: toValue(exhaustiveAdminOrgs),
    fetchTestData: toValue(fetchTestData),
    orderBy: toValue(orderBy),
  });

  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);

  if (!roarfirekit.value?.initialized) {
    console.error('AdministrationFetcher: Roarfirekit not initialized!');
    return []; // Return empty if not initialized
  }

  try {
    // Log before calling getAdministrations
    console.log('Calling roarfirekit.getAdministrations...');
    const administrationIds = await roarfirekit.value.getAdministrations({
      testData: toValue(fetchTestData),
    });
    console.log('Fetched administration IDs:', administrationIds);

    if (!administrationIds || administrationIds.length === 0) {
      console.log('No administration IDs found, returning empty list.');
      return [];
    }

    const axiosInstance = getAxiosInstance();
    const baseURL = axiosInstance.defaults.baseURL ?? '';
    const documentPrefix = baseURL.replace(
      'https://firestore.googleapis.com/v1/',
      ''
    );
    const documents = administrationIds.map(
      (id: string) => `${documentPrefix}/administrations/${id}`
    );
    console.log('Constructed document paths for batchGet:', documents);

    // Log before calling batchGet
    console.log('Calling axiosInstance.post(:batchGet) for administrations...');
    const { data } = await axiosInstance.post(':batchGet', { documents });
    console.log('Received batchGet response data:', data);

    const administrationData = data
      .map(({ found }: BatchGetResponse) => {
        if (found) {
          return {
            name: found.name,
            data: {
              id: _last(found.name.split('/')),
              ..._mapValues(found.fields, (value) => convertValues(value)),
            },
          };
        }
        return undefined;
      })
      .filter((item: { name: string; data: any } | undefined): item is { name: string; data: any } => item !== undefined);
    console.log('Mapped administration data before stats:', administrationData);

    const administrations = await mapAdministrations({
      isSuperAdmin,
      data: administrationData,
      adminOrgs: exhaustiveAdminOrgs,
    });
    console.log('Mapped administrations after stats:', administrations);

    const orderField = (orderBy?.value ?? orderByDefault)[0].field.fieldPath;
    const orderDirection = (orderBy?.value ?? orderByDefault)[0].direction;
    const sortedAdministrations = administrations
      .filter((a) => a[orderField] !== undefined)
      .sort((a, b) => {
        if (orderDirection === 'ASCENDING') return 2 * +(a[orderField] > b[orderField]) - 1;
        if (orderDirection === 'DESCENDING') return 2 * +(b[orderField] > a[orderField]) - 1;
        return 0;
      });

    console.log('Returning final sorted administrations:', sortedAdministrations);
    return sortedAdministrations;
  } catch (error: any) {
    console.error('Error in administrationPageFetcher:', error);
    if (error.response) {
      console.error('Error response details:', {
        status: error.response.status,
        data: JSON.stringify(error.response.data, null, 2),
        headers: error.response.headers,
      });
    }
    // Depending on requirements, might want to throw or return []
    return []; // Return empty array on error for now
  }
}; 