import { toValue, type Ref } from 'vue';
import _chunk from 'lodash/chunk';
import _last from 'lodash/last';
import _mapValues from 'lodash/mapValues';
import _without from 'lodash/without';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - utils likely needs TS conversion
import { convertValues, getAxiosInstance, orderByDefault } from './utils';
// @ts-ignore - helpers/index might need TS conversion
import { filterAdminOrgs } from '@/helpers';
import type { AxiosInstance } from 'axios'; // Assuming getAxiosInstance returns AxiosInstance

// --- Interfaces & Types ---

// Represents the structure of Firebase order by clause
interface FirebaseOrderBy {
    field: { fieldPath: string };
    direction: 'ASCENDING' | 'DESCENDING';
}

// Represents the structure of assigned organizations
interface AssignedOrgs {
    districts?: any; // Replace 'any' with more specific types if known
    schools?: any;
    classes?: any;
    groups?: any;
    families?: any;
}

// Fields from a raw administration document
interface AdministrationFields {
    id: string;
    name?: string;
    publicName?: string;
    dateOpened?: any; // Use specific date/timestamp type if known
    dateClosed?: any;
    dateCreated?: any;
    assessments?: any; // Type for assessments array
    districts?: any;
    schools?: any;
    classes?: any;
    groups?: any;
    families?: any;
    testData?: boolean;
    [key: string]: any; // Allow other fields
}

// Structure of an item in the batchGet response
interface BatchGetResponseItem {
    found?: {
        name: string;
        fields: Record<string, any>; // Raw fields from Firestore
    };
    missing?: string;
    transaction?: string;
    readTime?: string;
}

// Structure for processed stats document
interface ProcessedStat {
    name: string;
    data: Record<string, any>; // Processed fields using convertValues
}

// Structure for a processed administration document from batchGet
interface AdministrationDoc {
    name: string;
    data: AdministrationFields; // Processed fields using convertValues
}

// Structure for administration dates
interface AdministrationDates {
    start: any; // Type appropriately
    end: any;
    created: any;
}

// Structure for the final mapped administration object
interface MappedAdministration {
    id: string;
    name?: string;
    publicName?: string;
    dates: AdministrationDates;
    assessments?: any; // Type appropriately
    assignedOrgs: AssignedOrgs;
    testData: boolean;
    stats?: { // Make stats optional as it's added later
        total?: Record<string, any>;
    };
    [key: string]: any; // Allow sortable fields like 'name', 'dateOpened', etc.
}

// Placeholder type for roarfirekit - replace with actual type if available
interface Roarfirekit {
    getAdministrations: (options: { testData: boolean }) => Promise<string[]>;
    // Add other methods if used
}

// --- Functions ---

export function getTitle(item: { name?: string; publicName?: string }, isSuperAdmin: boolean): string | undefined {
  if (isSuperAdmin) {
    return item.name;
  } else {
    // Check if publicName exists, otherwise fallback to name
    return item.publicName ?? item.name;
  }
}

const processBatchStats = async (
    axiosInstance: AxiosInstance,
    statsPaths: string[],
    batchSize = 5
): Promise<ProcessedStat[]> => {
  const batchStatsDocs: ProcessedStat[] = [];
  const statsPathChunks = _chunk(statsPaths, batchSize);
  for (const batch of statsPathChunks) {
    // Assume response data is an array of BatchGetResponseItem
    const { data } = await axiosInstance.post<BatchGetResponseItem[]>(':batchGet', {
      documents: batch,
    });

    const processedBatch = _without(
      data.map(({ found }) => {
        if (found) {
          return {
            name: found.name,
            // Assume convertValues returns 'any', refine if possible
            data: _mapValues(found.fields, (value) => convertValues(value)),
          };
        }
        return undefined;
      }),
      undefined,
    ) as ProcessedStat[]; // Assert the type after filtering undefined

    batchStatsDocs.push(...processedBatch);
  }

  return batchStatsDocs;
};

interface MapAdministrationsArgs {
    isSuperAdmin: Ref<boolean>;
    data: AdministrationDoc[];
    adminOrgs: Ref<Record<string, any> | undefined>; // Type adminOrgs more precisely if possible
}

const mapAdministrations = async ({ isSuperAdmin, data, adminOrgs }: MapAdministrationsArgs): Promise<MappedAdministration[]> => {
  // First format the administration documents
  const administrationData: MappedAdministration[] = data
    .map((a: AdministrationDoc): AdministrationFields => a.data)
    .map((a: AdministrationFields): MappedAdministration => {
      let assignedOrgs: AssignedOrgs = {
        districts: a.districts,
        schools: a.schools,
        classes: a.classes,
        groups: a.groups,
        families: a.families,
      };
      // Use toValue to get the boolean value from the Ref
      if (!toValue(isSuperAdmin) && adminOrgs.value) {
        // Assume filterAdminOrgs returns AssignedOrgs
        assignedOrgs = filterAdminOrgs(adminOrgs.value, assignedOrgs) as AssignedOrgs;
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
        assignedOrgs,
        // If testData is not defined, default to false when mapping
        testData: a.testData ?? false,
        // stats will be added later
      };
    });

  // Create a list of all the stats document paths we need to get
  const statsPaths: string[] = data
    // First filter out any missing administration documents
    .filter((item: AdministrationDoc): item is Required<AdministrationDoc> => item.name !== undefined)
    // Then map to the total stats document path
    .map(({ name }: Required<AdministrationDoc>): string => `${name}/stats/total`);

  const axiosInstance = getAxiosInstance(); // Assume returns AxiosInstance
  const batchStatsDocs = await processBatchStats(axiosInstance, statsPaths);

  const administrations: MappedAdministration[] = administrationData.map((administration) => {
    const thisAdminStats = batchStatsDocs.find((statsDoc) => statsDoc.name.includes(administration.id));
    return {
      ...administration,
      stats: { total: thisAdminStats?.data }, // Add the stats data
    };
  });

  return administrations;
};

export const administrationPageFetcher = async (
    isSuperAdmin: Ref<boolean>,
    exhaustiveAdminOrgs: Ref<Record<string, any> | undefined>, // Type more precisely if possible
    fetchTestData: Ref<boolean> = ref(false), // Default should be a Ref<boolean>
    orderBy?: Ref<FirebaseOrderBy[] | undefined> // orderBy is optional Ref
): Promise<MappedAdministration[]> => {
  const authStore = useAuthStore();
  // Assert roarfirekit type using the placeholder interface
  const { roarfirekit } = storeToRefs(authStore) as { roarfirekit: Ref<Roarfirekit | undefined> };

  // Handle potential undefined roarfirekit
  if (!roarfirekit.value) {
      console.error("Roarfirekit not initialized");
      return [];
  }

  // Use toValue for fetchTestData Ref
  const administrationIds = await roarfirekit.value.getAdministrations({ testData: toValue(fetchTestData) });

  const axiosInstance = getAxiosInstance(); // Assume returns AxiosInstance
  const documentPrefix = axiosInstance.defaults.baseURL?.replace('https://firestore.googleapis.com/v1/', '') || ''; // Handle potential undefined baseURL
  const documents = administrationIds.map((id: string) => `${documentPrefix}/administrations/${id}`);

  // Assume response data is array of BatchGetResponseItem
  const { data } = await axiosInstance.post<BatchGetResponseItem[]>(':batchGet', { documents });

  const administrationData = _without(
    data.map(({ found }) => {
      if (found) {
        const id = _last(found.name.split('/'));
        if (!id) return undefined; // Skip if ID cannot be extracted

        return {
          name: found.name,
          data: {
            id: id, // Use extracted ID
            // Assume convertValues returns 'any', refine if possible
            ..._mapValues(found.fields, (value) => convertValues(value)),
          },
        };
      }
      return undefined;
    }),
    undefined,
  ) as AdministrationDoc[]; // Assert type after filtering undefined

  const administrations = await mapAdministrations({
    isSuperAdmin,
    data: administrationData,
    adminOrgs: exhaustiveAdminOrgs,
  });

  // Use toValue for orderBy Ref, provide default if undefined
  const currentOrderBy = toValue(orderBy) ?? orderByDefault;
  const orderField = currentOrderBy[0]?.field.fieldPath;
  const orderDirection = currentOrderBy[0]?.direction;

  // Ensure orderField is valid before sorting
  if (!orderField) {
      console.warn("Order field is undefined, returning unsorted administrations.");
      return administrations;
  }

  // Filter out items where the sort field is missing before sorting
  const sortedAdministrations = administrations
    .filter((a) => a[orderField] !== undefined)
    .sort((a, b) => {
      // Use non-null assertion assuming filter worked, or add checks
      const valA = a[orderField]!;
      const valB = b[orderField]!;
      if (orderDirection === 'ASCENDING') return 2 * +(valA > valB) - 1;
      if (orderDirection === 'DESCENDING') return 2 * +(valB > valA) - 1;
      return 0;
    });

  return sortedAdministrations;
}; 