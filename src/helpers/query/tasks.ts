import { toValue, type Ref } from 'vue';
import _mapValues from 'lodash/mapValues';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
// @ts-ignore - utils likely needs TS conversion
import { convertValues, getAxiosInstance, mapFields, fetchDocsById } from './utils';
import { FIRESTORE_DATABASES, FIRESTORE_COLLECTIONS } from '@/constants/firebase'; // Adjusted path
import type { AxiosInstance } from 'axios';

// --- Reused Interfaces (Consider moving to a common types file) ---
interface StringValue { stringValue: string; }
interface BooleanValue { booleanValue: boolean; }
interface IntegerValue { integerValue: string; }
interface DoubleValue { doubleValue: number; }
interface NullValue { nullValue: null; }
interface ArrayValue { arrayValue: { values?: Value[] }; }
type Value = StringValue | BooleanValue | IntegerValue | DoubleValue | NullValue | ArrayValue | { [key: string]: any };

interface OrderBy {
    field: { fieldPath: string };
    direction: 'ASCENDING' | 'DESCENDING';
}
interface FieldFilter {
    field: { fieldPath: string };
    op: 'EQUAL' | 'IN' | 'ARRAY_CONTAINS' | string;
    value: Value;
}
interface WhereFilter {
    fieldFilter?: FieldFilter;
    // Add compositeFilter/unaryFilter if needed for tasks/variants
}
interface Select {
    fields: { fieldPath: string }[];
}
interface From {
    collectionId: string;
    allDescendants?: boolean;
}
interface StructuredQuery {
    select?: Select;
    from: From[];
    where?: WhereFilter;
    orderBy?: OrderBy[];
    limit?: number;
    offset?: number;
}
interface Aggregation {
    alias: string;
    count?: {};
}
interface StructuredAggregationQuery {
    structuredQuery: StructuredQuery;
    aggregations: Aggregation[];
}
interface QueryRequestBody {
    structuredQuery?: StructuredQuery;
    structuredAggregationQuery?: StructuredAggregationQuery;
}
interface BatchGetResponseItem {
    found?: {
        name: string;
        fields: Record<string, any>;
    };
    missing?: string;
    transaction?: string;
    readTime?: string;
}
// Structure for fetchDocsById input
interface FetchSpec {
    collection: string;
    docId: string;
}

// --- Task/Variant Specific Interfaces ---
interface GetTasksRequestParams {
    registered?: boolean;
    allData?: boolean;
    orderBy?: OrderBy[];
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
    select?: string[];
}

interface GetVariantsRequestParams {
    registered?: boolean;
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
}

// Placeholder for Task document structure (refine based on actual fields)
export interface TaskData {
    id: string;
    name?: string;
    testData?: boolean;
    demoData?: boolean;
    registered?: boolean;
    [key: string]: any;
}

// Placeholder for Variant document structure (refine based on actual fields)
interface VariantData {
    id: string;
    parentDoc?: string; // Added by mapFields(data, true)
    registered?: boolean;
    [key: string]: any;
}

// Structure for the combined variant + task object
interface VariantWithTask {
    id: string;
    variant: VariantData;
    task: TaskData;
}

// Structure for raw Firestore document from runQuery response
interface FirestoreRunQueryDocument {
    document?: {
        name: string; // Full path like projects/.../databases/.../documents/tasks/taskId/variants/variantId
        fields: Record<string, Value>;
        createTime: string;
        updateTime: string;
    };
    readTime?: string;
    // For variants query, parentDoc ID might be added by mapFields if second arg is true
    parentDoc?: string;
    // Other properties might exist depending on mapFields logic
    id?: string; // Added by mapFields
}

// Structure for processed task document from batchGet
interface ProcessedTaskDoc {
    name: string; // Full path
    data: TaskData;
}

// --- Functions ---

export const getTasksRequestBody = ({
  registered = true,
  allData = false,
  orderBy,
  aggregationQuery = false,
  pageLimit,
  page,
  paginate = false,
  select = ['name'],
}: GetTasksRequestParams): QueryRequestBody => {
  const structuredQuery: StructuredQuery = {
      from: [{ collectionId: FIRESTORE_COLLECTIONS.TASKS, allDescendants: false }],
  };

  if (orderBy) {
    structuredQuery.orderBy = orderBy;
  }

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      structuredQuery.limit = pageLimit;
      structuredQuery.offset = page * pageLimit;
    }

    // Only add select if not requesting allData and select array has fields
    if (!allData && select.length > 0) {
      structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  if (registered) {
    structuredQuery.where = {
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
        structuredQuery,
        aggregations: [
          { alias: 'count', count: {} },
        ],
      },
    };
  }

  return { structuredQuery };
};

export const taskFetcher = async (
    registered: boolean = true,
    allData: boolean = false,
    select: string[] = ['name', 'testData', 'demoData']
): Promise<TaskData[]> => {
  const axiosInstance = getAxiosInstance('app'); // Assume returns AxiosInstance
  const requestBody = getTasksRequestBody({
    registered,
    allData,
    aggregationQuery: false,
    paginate: false,
    select: allData ? [] : select,
  });

  const { data } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', requestBody);
  // Cast input to any to bypass strict type check with mapFields due to Value definition difference
  return mapFields(data as any) as TaskData[];
};

/**
 * Fetch task documents by their IDs.
 *
 * @param taskIds – A Ref containing the array of task IDs to fetch.
 * @returns A promise resolving to the array of task documents.
 */
export const fetchByTaskId = async (taskIds: string[]): Promise<TaskData[]> => {
  // Ensure taskIds is not empty before proceeding
  if (!taskIds || taskIds.length === 0) {
      return []; // Return empty if no IDs
  }

  const taskDocs: FetchSpec[] = taskIds.map((taskId: string) => ({
    collection: FIRESTORE_COLLECTIONS.TASKS,
    docId: taskId,
  }));

  // Assuming fetchDocsById returns the documents typed appropriately (or cast needed)
  return fetchDocsById(taskDocs, FIRESTORE_DATABASES.APP) as Promise<TaskData[]>;
};

export const getVariantsRequestBody = ({
    registered = false,
    aggregationQuery = false,
    pageLimit,
    page,
    paginate = false
}: GetVariantsRequestParams): QueryRequestBody => {

  const structuredQuery: StructuredQuery = {
      from: [{ collectionId: 'variants', allDescendants: true }],
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      structuredQuery.limit = pageLimit;
      structuredQuery.offset = page * pageLimit;
    }
    // No select clause needed as we fetch all fields for variants
  }

  if (registered) {
    structuredQuery.where = {
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
        structuredQuery,
        aggregations: [
          { alias: 'count', count: {} },
        ],
      },
    };
  }

  return { structuredQuery };
};

export const variantsFetcher = async (registered: boolean = false): Promise<VariantWithTask[]> => {
  const axiosInstance = getAxiosInstance('app'); // Assume returns AxiosInstance
  const requestBody = getVariantsRequestBody({
    registered,
    aggregationQuery: false,
    paginate: false,
  });

  // Fetch raw variant documents
  const { data: rawVariantDocs } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', requestBody);

  // Cast input to any to bypass strict type check with mapFields
  const variants: VariantData[] = mapFields(rawVariantDocs as any, true) as VariantData[];

  // Extract unique parent task document paths
  const taskDocPaths: string[] = _uniq(
    _without(
      rawVariantDocs.map((variantDoc) => {
        if (variantDoc.document?.name) {
            // Use string literal for variants collection name
          return variantDoc.document.name.split(`/variants/`)[0];
        }
        return undefined;
      }),
      undefined,
    )
  ) as string[]; // Assert as string[] after filtering undefined

  if (taskDocPaths.length === 0) {
      return []; // No parent tasks found, return empty array
  }

  // Batch get parent task documents
  const { data: batchTaskResponse } = await axiosInstance.post<BatchGetResponseItem[]>(':batchGet', {
    documents: taskDocPaths,
  });

  // Process the batch response into a dictionary
  const processedTasks = _without(
      batchTaskResponse.map(({ found }) => {
          if (found && found.name) {
              const taskId = found.name.split(`/${FIRESTORE_COLLECTIONS.TASKS}/`)[1];
              if (taskId) {
                  return {
                      name: found.name,
                      data: {
                          id: taskId,
                          // Assume convertValues returns 'any', refine if possible
                          ..._mapValues(found.fields, (value) => convertValues(value)),
                      } as TaskData, // Assert type
                  };
              }
          }
          return undefined;
      }),
      undefined
  ) as ProcessedTaskDoc[]; // Assert type after filtering

  // Create a dictionary for easy lookup: taskId -> ProcessedTaskDoc
  const taskDocDict = processedTasks.reduce((acc, task) => {
      acc[task.data.id] = task;
      return acc;
  }, {} as Record<string, ProcessedTaskDoc>);

  // Match variants with their corresponding task data
  const variantsWithTasks = variants.map((variant): VariantWithTask | undefined => {
      // Ensure variant has a parentDoc ID
      if (variant.parentDoc && taskDocDict[variant.parentDoc]) {
          const taskDoc = taskDocDict[variant.parentDoc];
          return {
              id: variant.id, // Use variant's ID
              variant: variant, // The variant data itself
              task: taskDoc.data, // The parent task data
          };
      }
      // Log warning if parent task not found for a variant
      console.warn(`Parent task not found for variant ID: ${variant.id}, Parent ID: ${variant.parentDoc}`);
      return undefined;
  });

  // Filter out any undefined results (where parent task wasn't found)
  return _without(variantsWithTasks, undefined) as VariantWithTask[];
}; 