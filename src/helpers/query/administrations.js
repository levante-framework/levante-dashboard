import { toValue } from "vue";
import _chunk from "lodash/chunk";
import _last from "lodash/last";
import _mapValues from "lodash/mapValues";
import _without from "lodash/without";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { convertValues, getAxiosInstance, orderByDefault } from "./utils";
import { filterAdminOrgs } from "@/helpers";

export function getTitle(item, isSuperAdmin) {
  if (isSuperAdmin) {
    return item.name;
  } else {
    // Check if publicName exists, otherwise fallback to name
    return item.publicName ?? item.name;
  }
}

const processBatchStats = async (axiosInstance, statsPaths, batchSize = 5) => {
  // Handle empty statsPaths array to prevent unnecessary API calls
  if (!statsPaths || statsPaths.length === 0) {
    console.log('processBatchStats: No stats paths provided, returning empty array');
    return [];
  }

  // Fix document paths for emulators
  const baseURL = axiosInstance.defaults.baseURL;
  let documentPrefix;
  if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
    // For emulators, use the project path format
    documentPrefix = "projects/hs-levante-admin-dev/databases/(default)/documents";
  } else {
    // For production, use the existing logic
    documentPrefix = baseURL.replace("https://firestore.googleapis.com/v1/", "");
  }
  
  // Convert relative paths to full document paths
  const fullStatsPaths = statsPaths.map(path => {
    if (path.startsWith('projects/')) {
      return path; // Already a full path
    }
    return `${documentPrefix}/administrations/${path}`;
  });

  const batchStatsDocs = [];
  
  // For emulators, use individual document fetches
  if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
    console.log('processBatchStats: Using individual document fetches for emulator');
    
    try {
      const documentPromises = statsPaths.map(async (path) => {
        // Extract the relative path for the API call
        const relativePath = path.replace(/^.*\/administrations\//, 'administrations/');
        const response = await axiosInstance.get(`/${relativePath}`);
        return {
          name: `${documentPrefix}/administrations/${path}`,
          data: _mapValues(response.data.fields, (value) => convertValues(value)),
        };
      });
      
      const responses = await Promise.all(documentPromises);
      batchStatsDocs.push(...responses.filter(doc => doc !== undefined));
    } catch (error) {
      console.warn('processBatchStats: Some stats documents may not exist, continuing...', error);
      // Don't throw error for stats documents as they may not exist
    }
  } else {
    // For production, use batchGet
    const statsPathChunks = _chunk(fullStatsPaths, batchSize);
    for (const batch of statsPathChunks) {
      const { data } = await axiosInstance.post(":batchGet", {
        documents: batch,
      });

      const processedBatch = _without(
        data.map(({ found }) => {
          if (found) {
            return {
              name: found.name,
              data: _mapValues(found.fields, (value) => convertValues(value)),
            };
          }
          return undefined;
        }),
        undefined,
      );

      batchStatsDocs.push(...processedBatch);
    }
  }

  return batchStatsDocs;
};

const mapAdministrations = async ({ isSuperAdmin, data, adminOrgs }) => {
  // First format the administration documents
  const administrationData = data
    .map((a) => a.data)
    .map((a) => {
      let assignedOrgs = {
        districts: a.districts,
        schools: a.schools,
        classes: a.classes,
        groups: a.groups,
        families: a.families,
      };
      if (!isSuperAdmin.value) {
        assignedOrgs = filterAdminOrgs(adminOrgs.value, assignedOrgs);
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
      };
    });

  // Create a list of all the stats document paths we need to get
  const statsPaths = data
    // First filter out any missing administration documents
    .filter((item) => item.name !== undefined)
    // Then map to the total stats document
    .map(({ name }) => `${name}/stats/total`);

  const axiosInstance = getAxiosInstance();
  const batchStatsDocs = await processBatchStats(axiosInstance, statsPaths);

  const administrations = administrationData?.map((administration) => {
    const thisAdminStats = batchStatsDocs.find((statsDoc) =>
      statsDoc.name.includes(administration.id),
    );
    return {
      ...administration,
      stats: { total: thisAdminStats?.data },
    };
  });

  return administrations;
};

export const administrationPageFetcher = async (
  isSuperAdmin,
  exhaustiveAdminOrgs,
  fetchTestData = false,
  orderBy,
) => {
  console.log('administrationPageFetcher: Starting fetch', {
    isSuperAdmin: isSuperAdmin?.value,
    exhaustiveAdminOrgs: exhaustiveAdminOrgs?.value,
    fetchTestData: toValue(fetchTestData),
    orderBy: orderBy?.value
  });

  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);
  
  console.log('administrationPageFetcher: Firekit state', {
    hasFirekit: !!roarfirekit.value,
    initialized: roarfirekit.value?.initialized,
    hasGetAdministrations: typeof roarfirekit.value?.getAdministrations === 'function'
  });

  console.log('administrationPageFetcher: About to call getAdministrations...');
  
  let administrationIds;
  try {
    administrationIds = await roarfirekit.value.getAdministrations({
      testData: toValue(fetchTestData),
    });
    
    console.log('administrationPageFetcher: getAdministrations returned:', administrationIds);
  } catch (error) {
    console.error('administrationPageFetcher: Error calling getAdministrations:', error);
    throw error;
  }

  // Handle empty administrationIds array to prevent 400 Bad Request
  if (!administrationIds || administrationIds.length === 0) {
    console.log('administrationPageFetcher: No administrations found, returning empty array');
    return [];
  }

  console.log('administrationPageFetcher: Getting axios instance...');
  const axiosInstance = getAxiosInstance();
  console.log('administrationPageFetcher: Axios instance created');

  // Fix document path construction for emulators
  const baseURL = axiosInstance.defaults.baseURL;
  console.log('administrationPageFetcher: Base URL:', baseURL);
  
  let documentPrefix;
  if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
    // For emulators, use the project path format
    documentPrefix = "projects/hs-levante-admin-dev/databases/(default)/documents";
  } else {
    // For production, use the existing logic
    documentPrefix = baseURL.replace("https://firestore.googleapis.com/v1/", "");
  }
  
  const documents = administrationIds.map(
    (id) => `${documentPrefix}/administrations/${id}`,
  );

  console.log('administrationPageFetcher: About to fetch documents:', documents);
  console.log('administrationPageFetcher: Document paths:', JSON.stringify(documents, null, 2));

  let data;
  
  // For emulators, use individual document fetches instead of batchGet
  if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
    console.log('administrationPageFetcher: Using individual document fetches for emulator');
    
    try {
      const documentPromises = administrationIds.map(async (id) => {
        const response = await axiosInstance.get(`/administrations/${id}`);
        return {
          found: {
            name: `${documentPrefix}/administrations/${id}`,
            fields: response.data.fields
          }
        };
      });
      
      const responses = await Promise.all(documentPromises);
      data = responses;
      console.log('administrationPageFetcher: Individual documents fetched successfully');
      console.log('administrationPageFetcher: Raw response data:', data);
    } catch (error) {
      console.error('administrationPageFetcher: Error in individual document fetches:', error);
      console.error('administrationPageFetcher: Error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('administrationPageFetcher: Error status:', error.response?.status);
      throw error;
    }
  } else {
    // For production, use batchGet
    console.log('administrationPageFetcher: Using batchGet for production');
    
    try {
      const response = await axiosInstance.post(":batchGet", { documents });
      data = response.data;
      console.log('administrationPageFetcher: Documents fetched successfully, processing...');
      console.log('administrationPageFetcher: Raw response data:', data);
    } catch (error) {
      console.error('administrationPageFetcher: Error in batchGet request:', error);
      console.error('administrationPageFetcher: Error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('administrationPageFetcher: Error status:', error.response?.status);
      console.error('administrationPageFetcher: Documents that failed:', JSON.stringify(documents, null, 2));
      console.error('administrationPageFetcher: Request body was:', JSON.stringify({ documents }, null, 2));
      throw error;
    }
  }

  console.log('administrationPageFetcher: Documents fetched, processing...');

  const administrationData = _without(
    data.map(({ found }) => {
      if (found) {
        return {
          name: found.name,
          data: {
            id: _last(found.name.split("/")),
            ..._mapValues(found.fields, (value) => convertValues(value)),
          },
        };
      }
      return undefined;
    }),
    undefined,
  );

  console.log('administrationPageFetcher: About to map administrations...');

  const administrations = await mapAdministrations({
    isSuperAdmin,
    data: administrationData,
    adminOrgs: exhaustiveAdminOrgs,
  });

  console.log('administrationPageFetcher: Administrations mapped, sorting...');

  const orderField = (orderBy?.value ?? orderByDefault)[0].field.fieldPath;
  const orderDirection = (orderBy?.value ?? orderByDefault)[0].direction;
  const sortedAdministrations = administrations
    .filter((a) => a[orderField] !== undefined)
    .sort((a, b) => {
      if (orderDirection === "ASCENDING")
        return 2 * +(a[orderField] > b[orderField]) - 1;
      if (orderDirection === "DESCENDING")
        return 2 * +(b[orderField] > a[orderField]) - 1;
      return 0;
    });

  console.log('administrationPageFetcher: Completed successfully, returning:', sortedAdministrations);

  return sortedAdministrations;
};
