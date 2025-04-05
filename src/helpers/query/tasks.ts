import { toValue } from 'vue';
import _mapValues from 'lodash/mapValues';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
import _groupBy from 'lodash/groupBy';
import _get from 'lodash/get';
import { convertValues, getAxiosInstance, mapFields, fetchDocsById, getProjectId, batchGetDocs } from './utils';
import { FIRESTORE_DATABASES, FIRESTORE_COLLECTIONS, FirestoreDatabase } from '../../constants/firebase';

interface TasksRequestBodyParams {
  registered?: boolean;
  allData?: boolean;
  orderBy?: any;
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
  select?: string[];
}

interface StructuredQuery {
  orderBy?: any;
  limit?: number;
  offset?: number;
  select?: {
    fields: Array<{ fieldPath: string }>;
  };
  from: Array<{
    collectionId: string;
    allDescendants: boolean;
  }>;
  where?: {
    fieldFilter: {
      field: { fieldPath: string };
      op: string;
      value: { booleanValue: boolean };
    };
  };
}

interface RequestBody {
  structuredQuery: StructuredQuery;
}

interface TaskDocument {
  document?: {
    name: string;
    fields: Record<string, any>;
  };
}

interface TaskData {
  id: string;
  name: string;
  testData?: any;
  demoData?: any;
  registered?: boolean;
  [key: string]: any;
}

interface VariantData {
  id: string;
  variant: any;
  task: TaskData;
}

interface FetchedDoc {
  id: string;
  collection: string;
  name?: string;
  [key: string]: any;
}

interface QueryResponse {
  document?: {
    name: string;
    fields: Record<string, any>;
  };
}

export const getTasksRequestBody = ({
  registered = true,
  allData = false,
  orderBy,
  aggregationQuery,
  pageLimit,
  page,
  paginate = false,
  select = ['name'],
}: TasksRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'tasks',
          allDescendants: false,
        },
      ],
    },
  };

  if (orderBy) {
    requestBody.structuredQuery.orderBy = orderBy;
  }

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    if (!allData) {
      requestBody.structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  if (registered) {
    requestBody.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'registered' },
        op: 'EQUAL',
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
            alias: 'count',
            count: {},
          },
        ],
      },
    } as any;
  }

  return requestBody;
};

export const taskFetcher = async (
  registered = true,
  allData = false,
  select = ['name', 'testData', 'demoData']
): Promise<TaskData[]> => {
  console.log('Fetching tasks with params:', { registered, allData, select });
  
  try {
    const axiosInstance = getAxiosInstance('admin');
    console.log('Successfully got axios instance');
    
    const requestBody = getTasksRequestBody({
      registered,
      allData,
      aggregationQuery: false,
      paginate: false,
      select: allData ? [] : select,
    });
    console.log('Generated request body:', JSON.stringify(requestBody, null, 2));

    const { data } = await axiosInstance.post<TaskDocument[]>(':runQuery', requestBody);
    console.log('Successfully fetched tasks, count:', data?.length);
    
    return mapFields(data) as TaskData[];
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    throw error;
  }
};

export const fetchByTaskId = async (taskIds: string[]): Promise<TaskData[]> => {
  const taskDocs = toValue(taskIds).map((taskId) => ({
    collection: FIRESTORE_COLLECTIONS.TASKS,
    docId: taskId,
  }));

  const docs = await fetchDocsById(taskDocs, FIRESTORE_DATABASES.ADMIN) as FetchedDoc[];
  return docs.map(doc => ({
    name: doc.name || '',
    ...doc
  })) as TaskData[];
};

interface VariantsRequestBodyParams {
  registered?: boolean;
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
}

export const getVariantsRequestBody = ({
  registered = false,
  aggregationQuery,
  pageLimit,
  page,
  paginate = false,
}: VariantsRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'variants',
          allDescendants: true,
        },
      ],
    },
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }
  }

  if (registered) {
    requestBody.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'registered' },
        op: 'EQUAL',
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
            alias: 'count',
            count: {},
          },
        ],
      },
    } as any;
  }

  return requestBody;
};

/**
 * Fetch task variants, including their parent task data.
 *
 * @param {Boolean} registered - Whether to fetch registered task variants only.
 * @returns {Promise<VariantData[]>} The array of task variant data, with nested task info.
 */
export const variantsFetcher = async (registered = false): Promise<VariantData[]> => {
  console.log(`Fetching task variants with params: registered=${registered}`);
  // @ts-ignore - Suppress persistent TS error
  const axiosInstance = getAxiosInstance(FIRESTORE_DATABASES.APP);

  const requestBody = getVariantsRequestBody({
    registered,
    aggregationQuery: false,
    paginate: false,
  });
  console.log('Generated request body for variants:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await axiosInstance.post(':runQuery', requestBody);

    // Step 1: Process initial variant response
    const rawVariants = response.data
      .filter(({ document }: QueryResponse) => document)
      .map(({ document }: QueryResponse) => {
        if (!document) return null;
        const pathParts = document.name.split('/'); // e.g., projects/.../databases/(default)/documents/tasks/TASK_ID/variants/VARIANT_ID
        const variantId = pathParts.pop();
        pathParts.pop(); // Remove 'variants' part
        const taskId = pathParts.pop(); // Get the parent Task ID

        return {
          id: variantId,
          // Store taskId to fetch parent later
          taskId: taskId,
          // Process variant fields directly
          variant: _mapValues(document.fields, convertValues),
        };
      })
      // Add explicit type for 'doc'
      .filter((doc: { id: string; taskId: string; variant: any } | null): doc is { id: string; taskId: string; variant: any } => doc !== null && !!doc.taskId);

    if (!rawVariants.length) {
      console.log('No raw variants found.');
      return [];
    }

    // Step 2: Get unique Task IDs and prepare paths for batchGetDocs
    // Add explicit type for 'v'
    const uniqueTaskIds = _uniq(rawVariants.map((v: { taskId: string }) => v.taskId));
    const taskDocPaths = uniqueTaskIds.map(id => `tasks/${id}`);
    console.log(`Fetching parent task data for IDs: ${uniqueTaskIds.join(', ')}`);

    // Step 3: Fetch parent Task documents
    // @ts-ignore - Suppress persistent TS error
    const taskDocs = await batchGetDocs(taskDocPaths, [], FIRESTORE_DATABASES.APP);
    const tasksById = _groupBy(taskDocs, 'id');

    // Step 4: Combine variant data with parent task data
    // Add explicit type for 'variant'
    const finalVariants = rawVariants.map((variant: { id: string; taskId: string; variant: any }) => {
      const parentTaskData = _get(tasksById, [variant.taskId, 0]); // groupBy creates an array, get the first element
      if (!parentTaskData) {
        console.warn(`Parent task data not found for task ID: ${variant.taskId}`);
        return null; // Or handle as needed
      }
      return {
        id: variant.id,
        variant: variant.variant,
        // Nest the fetched task data
        task: parentTaskData,
      };
    }).filter((v: VariantData | null): v is VariantData => v !== null); // Filter out any nulls from missing tasks

    console.log(`Processed ${finalVariants.length} final task variants.`);
    return finalVariants;

  } catch (error: any) {
    console.error('Error fetching task variants:', error);
    if (error.response) {
      console.error('Error response details:', {
        status: error.response.status,
        data: JSON.stringify(error.response.data, null, 2),
        headers: error.response.headers,
      });
    }
    throw error; // Re-throw the error
  }
}; 