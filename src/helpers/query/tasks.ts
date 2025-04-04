import { toValue } from 'vue';
import _mapValues from 'lodash/mapValues';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
import { convertValues, getAxiosInstance, mapFields, fetchDocsById } from './utils';
import { FIRESTORE_DATABASES, FIRESTORE_COLLECTIONS } from '../../constants/firebase';

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
  const axiosInstance = getAxiosInstance('admin');
  const requestBody = getTasksRequestBody({
    registered,
    allData,
    aggregationQuery: false,
    paginate: false,
    select: allData ? [] : select,
  });

  const { data } = await axiosInstance.post<TaskDocument[]>(':runQuery', requestBody);
  return mapFields(data) as TaskData[];
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

export const variantsFetcher = async (registered = false): Promise<VariantData[]> => {
  const axiosInstance = getAxiosInstance('admin');
  const requestBody = getVariantsRequestBody({
    registered,
    aggregationQuery: false,
    paginate: false,
  });

  const { data } = await axiosInstance.post<TaskDocument[]>(':runQuery', requestBody);
  const variants = mapFields(data, true) as Array<{ id: string; parentDoc: string }>;

  const taskDocPaths = _uniq(
    _without(
      data.map((taskDoc) => {
        if (taskDoc.document?.name) {
          return taskDoc.document.name.split('/variants/')[0];
        }
        return undefined;
      }),
      undefined
    )
  );

  const batchTaskDocs = await axiosInstance
    .post<{ found?: { name: string; fields: Record<string, any> } }[]>(':batchGet', {
      documents: taskDocPaths,
    })
    .then(({ data }) => {
      return _without(
        data.map(({ found }) => {
          if (found) {
            return {
              name: found.name,
              data: {
                id: found.name.split('/tasks/')[1],
                name: '', // Default name if not provided
                ..._mapValues(found.fields, (value) => convertValues(value)),
              },
            };
          }
          return undefined;
        }),
        undefined
      );
    });

  const taskDocDict = batchTaskDocs.reduce<Record<string, { name: string; data: TaskData }>>((acc, task) => {
    if (task && task.data) {
      acc[task.data.id] = { name: task.name, data: task.data };
    }
    return acc;
  }, {});

  return variants.map((variant) => {
    const task = taskDocDict[variant.parentDoc];
    if (!task) {
      throw new Error(`Task not found for variant ${variant.id}`);
    }
    return {
      id: variant.id,
      variant,
      task: task.data,
    };
  });
}; 