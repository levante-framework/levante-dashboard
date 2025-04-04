import { toValue } from 'vue';
import _pick from 'lodash/pick';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
import { convertValues, getAxiosInstance, mapFields } from './utils';
import { pluralizeFirestoreCollection } from '@/helpers';

interface RunsRequestBodyParams {
  administrationId: string;
  orgType: string;
  orgId: string;
  taskId?: string;
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
  select?: string[];
  allDescendants?: boolean;
  requireCompleted?: boolean;
}

interface StructuredQuery {
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
    compositeFilter: {
      op: string;
      filters: Array<{
        fieldFilter: {
          field: { fieldPath: string };
          op: string;
          value: any;
        };
      }>;
    };
  };
}

interface RequestBody {
  structuredQuery: StructuredQuery;
}

interface RunDocument {
  document?: {
    name: string;
    fields: Record<string, any>;
  };
}

interface UserDocument {
  name: string;
  fields: Record<string, any>;
}

interface BatchGetResponse {
  found?: UserDocument;
}

interface RunData {
  id: string;
  assignmentId: string;
  taskId: string;
  bestRun: boolean;
  completed: boolean;
  scores: {
    computed: {
      composite: number;
    };
  };
  readOrgs: Record<string, string[]>;
  userData?: {
    grade?: string;
    birthMonth?: string;
    birthYear?: string;
    schools?: {
      current?: string;
    };
  };
}

/**
 * Constructs the request body for fetching runs based on the provided parameters.
 */
export const getRunsRequestBody = ({
  administrationId,
  orgType,
  orgId,
  taskId,
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = ['scores.computed.composite'],
  allDescendants = true,
  requireCompleted = false,
}: RunsRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'runs',
          allDescendants,
        },
      ],
    },
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    if (select) {
      requestBody.structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  if (administrationId && (orgId || !allDescendants)) {
    requestBody.structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: 'assignmentId' },
              op: 'EQUAL',
              value: { stringValue: administrationId },
            },
          },
          {
            fieldFilter: {
              field: { fieldPath: 'bestRun' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        ],
      },
    };

    if (orgId) {
      requestBody.structuredQuery.where.compositeFilter.filters.push({
        fieldFilter: {
          field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType)}` },
          op: 'ARRAY_CONTAINS',
          value: { stringValue: orgId },
        },
      });
    }
  } else {
    requestBody.structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: 'bestRun' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        ],
      },
    };
  }

  if (taskId) {
    requestBody.structuredQuery.where!.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: 'taskId' },
        op: 'EQUAL',
        value: { stringValue: taskId },
      },
    });
  }

  if (requireCompleted) {
    requestBody.structuredQuery.where!.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: 'completed' },
        op: 'EQUAL',
        value: { booleanValue: true },
      },
    });
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
 * Counts the number of runs for a given administration and organization.
 */
export const runCounter = async (
  administrationId: string,
  orgType: string,
  orgId: string
): Promise<number> => {
  const axiosInstance = getAxiosInstance('admin');
  const requestBody = getRunsRequestBody({
    administrationId: toValue(administrationId),
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: true,
  });
  const { data } = await axiosInstance.post(':runAggregationQuery', requestBody);
  return Number(convertValues(data[0].result?.aggregateFields?.count));
};

interface RunPageFetcherParams {
  administrationId: string;
  userId?: string;
  orgType: string;
  orgId: string;
  taskId?: string;
  pageLimit?: number;
  page?: number;
  select?: string[];
  scoreKey?: string;
  paginate?: boolean;
}

/**
 * Fetches run page data for a given set of parameters.
 */
export const runPageFetcher = async ({
  administrationId,
  userId,
  orgType,
  orgId,
  taskId,
  pageLimit,
  page,
  select = ['scores.computed.composite'],
  scoreKey = 'scores.computed.composite',
  paginate = true,
}: RunPageFetcherParams): Promise<RunData[]> => {
  const appAxiosInstance = getAxiosInstance('admin');
  const requestBody = getRunsRequestBody({
    administrationId: toValue(administrationId),
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    taskId: toValue(taskId),
    allDescendants: toValue(userId) === undefined,
    aggregationQuery: false,
    pageLimit: paginate ? toValue(pageLimit) : undefined,
    page: paginate ? toValue(page) : undefined,
    paginate: toValue(paginate),
    select: toValue(select),
  });

  const runQuery = toValue(userId) === undefined ? ':runQuery' : `/users/${toValue(userId)}:runQuery`;
  const { data } = await appAxiosInstance.post<RunDocument[]>(runQuery, requestBody);
  const runData = mapFields(data, true) as unknown as RunData[];

  const userDocPaths = _uniq(
    _without(
      data.map((runDoc) => {
        if (runDoc.document?.name) {
          return runDoc.document.name.split('/runs/')[0];
        }
        return undefined;
      }),
      undefined
    )
  );

  // Use batchGet to get all user docs with one post request
  const batchUserDocs = await appAxiosInstance
    .post<{ found?: UserDocument }[]>(':batchGet', {
      documents: userDocPaths,
      mask: { fieldPaths: ['grade', 'birthMonth', 'birthYear', 'schools.current'] },
    })
    .then(({ data }) => {
      return _without(
        data.map(({ found }) => {
          if (found) {
            return {
              name: found.name,
              id: found.name.split('/users/')[1],
              data: _mapValues(found.fields, (value) => convertValues(value)),
            };
          }
          return undefined;
        }),
        undefined
      );
    });

  // Add user data to run data
  return runData.map((run) => {
    const userDoc = batchUserDocs.find((doc) => doc?.id === run.id);
    if (userDoc) {
      run.userData = userDoc.data;
    }
    return run;
  });
}; 