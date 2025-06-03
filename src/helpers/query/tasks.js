import { toValue } from "vue";
import _mapValues from "lodash/mapValues";
import _uniq from "lodash/uniq";
import _without from "lodash/without";
import {
  convertValues,
  getAxiosInstance,
  mapFields,
  fetchDocsById,
} from "./utils";
import {
  FIRESTORE_DATABASES,
  FIRESTORE_COLLECTIONS,
} from "../../constants/firebase";

export const getTasksRequestBody = ({
  registered = true,
  allData = false,
  orderBy,
  aggregationQuery,
  pageLimit,
  page,
  paginate = false,
  select = ["name"],
}) => {
  const requestBody = { structuredQuery: {} };

  if (orderBy) {
    requestBody.structuredQuery.orderBy = orderBy;
  }

  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    if (!allData) {
      requestBody.structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  requestBody.structuredQuery.from = [
    {
      collectionId: "tasks",
      allDescendants: false,
    },
  ];

  if (registered) {
    requestBody.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: "registered" },
        op: "EQUAL",
        value: { booleanValue: true },
      },
    };
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: "count",
            count: {},
          },
        ],
      },
    };
  }

  return requestBody;
};

export const taskFetcher = async (
  registered = true,
  allData = false,
  select = ["name", "testData", "demoData"],
) => {
  console.log('taskFetcher: Starting task fetch with params:', { registered, allData, select });
  
  // Use firekit method instead of direct REST API calls
  const { useAuthStore } = await import("@/store/auth");
  const authStore = useAuthStore();
  
  console.log('taskFetcher: Auth store state:', {
    hasFirekit: !!authStore.roarfirekit,
    initialized: authStore.roarfirekit?.initialized,
    hasGetTasks: typeof authStore.roarfirekit?.getTasks === 'function'
  });
  
  if (!authStore.roarfirekit || !authStore.roarfirekit.initialized) {
    console.error('taskFetcher: Firekit not initialized');
    throw new Error('Firekit not initialized');
  }

  try {
    console.log('taskFetcher: Calling firekit.getTasks...');
    const tasks = await authStore.roarfirekit.getTasks(registered, allData);
    console.log('taskFetcher: Successfully fetched tasks:', { count: tasks?.length, tasks });
    return tasks;
  } catch (error) {
    console.error('taskFetcher: Error fetching tasks via firekit:', error);
    throw error;
  }
};

/**
 * Fetch task documents by their IDs.
 *
 * @param {Array<String>} taskIds – The array of task IDs to fetch.
 * @returns {Promise<Array<Object>>} The array of task documents.
 */
export const fetchByTaskId = async (taskIds) => {
  const taskDocs = toValue(taskIds).map((taskId) => ({
    collection: FIRESTORE_COLLECTIONS.TASKS,
    docId: taskId,
  }));

  return fetchDocsById(taskDocs, FIRESTORE_DATABASES.APP);
};

export const getVariantsRequestBody = ({
  registered = false,
  aggregationQuery,
  pageLimit,
  page,
  paginate = false,
}) => {
  const requestBody = { structuredQuery: {} };

  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }
  }

  requestBody.structuredQuery.from = [
    {
      collectionId: "variants",
      allDescendants: true,
    },
  ];

  if (registered) {
    requestBody.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: "registered" },
        op: "EQUAL",
        value: { booleanValue: true },
      },
    };
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: "count",
            count: {},
          },
        ],
      },
    };
  }

  return requestBody;
};

export const variantsFetcher = async (registered = false) => {
  console.log('variantsFetcher: Starting variant fetch with params:', { registered });
  
  // Use firekit method instead of direct REST API calls
  const { useAuthStore } = await import("@/store/auth");
  const authStore = useAuthStore();
  
  console.log('variantsFetcher: Auth store state:', {
    hasFirekit: !!authStore.roarfirekit,
    initialized: authStore.roarfirekit?.initialized,
    hasGetVariants: typeof authStore.roarfirekit?.getVariants === 'function'
  });
  
  if (!authStore.roarfirekit || !authStore.roarfirekit.initialized) {
    console.error('variantsFetcher: Firekit not initialized');
    throw new Error('Firekit not initialized');
  }

  try {
    console.log('variantsFetcher: Calling firekit.getVariants...');
    
    // Try calling with different parameters to include test data
    // The firekit method might accept additional options
    let variants;
    try {
      // First try with testData option
      variants = await authStore.roarfirekit.getVariants(registered, { includeTestData: true });
      console.log('variantsFetcher: Called with includeTestData option');
    } catch (error) {
      console.log('variantsFetcher: includeTestData option not supported, trying with testData parameter');
      try {
        // Try with testData as second parameter
        variants = await authStore.roarfirekit.getVariants(registered, true);
        console.log('variantsFetcher: Called with testData as second parameter');
      } catch (error2) {
        console.log('variantsFetcher: testData parameter not supported, using default call');
        // Fall back to default call
        variants = await authStore.roarfirekit.getVariants(registered);
        console.log('variantsFetcher: Called with default parameters');
      }
    }
    
    console.log('variantsFetcher: Successfully fetched variants:', { 
      count: variants?.length, 
      isArray: Array.isArray(variants),
      firstVariant: variants?.[0],
      allVariantIds: variants?.map(v => v?.id || v?.variant?.id || 'no-id'),
      sampleVariantStructure: variants?.[0] ? Object.keys(variants[0]) : 'no variants',
      rawVariantsResponse: variants,
      variantsType: typeof variants,
      variantsConstructor: variants?.constructor?.name
    });
    
    // If firekit returns empty results, try direct REST API call as fallback
    if (!variants || variants.length === 0) {
      console.log('variantsFetcher: Firekit returned empty results, trying direct REST API call...');
      
      const { getAxiosInstance } = await import("@/helpers/query/utils");
      const axiosInstance = getAxiosInstance();
      
      try {
        const response = await axiosInstance.get('/variants');
        console.log('variantsFetcher: Direct REST API response:', response.data);
        
        if (response.data?.documents) {
          // Transform the REST API response to match the expected format
          const transformedVariants = response.data.documents.map(doc => {
            const fields = doc.fields;
            return {
              id: fields.id?.stringValue,
              name: fields.name?.stringValue,
              description: fields.description?.stringValue,
              registered: fields.registered?.booleanValue,
              testData: fields.testData?.booleanValue,
              task: {
                id: fields.task?.mapValue?.fields?.id?.stringValue,
                name: fields.task?.mapValue?.fields?.name?.stringValue
              },
              variant: {
                id: fields.variant?.mapValue?.fields?.id?.stringValue,
                name: fields.variant?.mapValue?.fields?.name?.stringValue,
                params: fields.variant?.mapValue?.fields?.params?.mapValue?.fields || {},
                conditions: fields.variant?.mapValue?.fields?.conditions?.arrayValue?.values || []
              }
            };
          });
          
          console.log('variantsFetcher: Transformed variants from REST API:', {
            count: transformedVariants.length,
            firstVariant: transformedVariants[0]
          });
          
          return transformedVariants;
        }
      } catch (restError) {
        console.error('variantsFetcher: Direct REST API call also failed:', restError);
      }
    }
    
    return variants;
  } catch (error) {
    console.error('variantsFetcher: Error fetching variants via firekit:', error);
    throw error;
  }
};
