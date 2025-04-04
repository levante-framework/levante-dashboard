import { toValue, toRaw } from 'vue';
import _find from 'lodash/find';
import _flatten from 'lodash/flatten';
import _get from 'lodash/get';
import _groupBy from 'lodash/groupBy';
import _mapValues from 'lodash/mapValues';
import _replace from 'lodash/replace';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
import _isEmpty from 'lodash/isEmpty';
import { convertValues, getAxiosInstance, getProjectId, mapFields } from './utils';
import { pluralizeFirestoreCollection, isLevante } from '@/helpers';

const userSelectFields = ['name', 'assessmentPid', 'username', 'studentData', 'schools', 'classes', 'userType'] as const;

const assignmentSelectFields = [
  'assessments',
  'assigningOrgs',
  'completed',
  'dateAssigned',
  'dateClosed',
  'dateOpened',
  'id',
  'legal',
  'name',
  'publicName',
  'readOrgs',
  'sequential',
  'started',
] as const;

interface AssignmentRequestBodyParams {
  adminId?: string;
  orgType?: string;
  orgId?: string;
  orgArray?: string[];
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
  select?: (typeof assignmentSelectFields)[number][];
  filter?: {
    value?: string;
    taskId?: string;
    field?: string;
  };
  orderBy?: any[];
  grades?: string[];
  isCollectionGroupQuery?: boolean;
}

interface FilteredScoresRequestBodyParams {
  adminId: string;
  orgId?: string;
  orgType?: string;
  orgArray?: string[];
  filter: {
    taskId: string;
  };
  select?: string[];
  aggregationQuery?: boolean;
  grades?: string[];
  paginate?: boolean;
  page?: number;
  pageLimit?: number;
}

interface ScoresRequestBodyParams {
  runIds: string[];
  orgType?: string;
  orgId?: string;
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
  select?: string[];
}

interface Assignment {
  id: string;
  name: string;
  publicName?: string;
  assessments: any[];
  assigningOrgs: Record<string, string[]>;
  completed: boolean;
  dateAssigned: string;
  dateClosed: string;
  dateOpened: string;
  legal: any;
  readOrgs: Record<string, string[]>;
  sequential: boolean;
  started: boolean;
  userData?: {
    grade?: string;
  };
  progress?: Record<string, string>;
}

interface Run {
  id: string;
  assignmentId: string;
  taskId: string;
  bestRun: boolean;
  scores: any;
  reliable?: boolean;
  engagementFlags?: any;
  readOrgs: Record<string, string[]>;
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
    compositeFilter?: {
      op: string;
      filters: Array<{
        fieldFilter: {
          field: { fieldPath: string };
          op: string;
          value: any;
        };
      }>;
    };
    fieldFilter?: {
      field: { fieldPath: string };
      op: string;
      value: any;
    };
  };
  orderBy?: any[];
}

interface RequestBody {
  structuredQuery: StructuredQuery;
}

export const getAssignmentsRequestBody = ({
  adminId,
  orgType,
  orgId,
  orgArray = [],
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = [...assignmentSelectFields],
  filter = {},
  orderBy = [],
  grades = [],
  isCollectionGroupQuery = true,
}: AssignmentRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'assignments',
          allDescendants: isCollectionGroupQuery,
        },
      ],
    },
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    if (select.length > 0) {
      requestBody.structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  if (adminId && (orgId || orgArray)) {
    requestBody.structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: 'id' },
              op: 'EQUAL',
              value: { stringValue: adminId },
            },
          },
        ],
      },
    };

    if (!_isEmpty(orgArray)) {
      requestBody.structuredQuery.where.compositeFilter!.filters.push({
        fieldFilter: {
          field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType!)}` },
          op: 'ARRAY_CONTAINS_ANY',
          value: {
            arrayValue: {
              values: orgArray.map((orgId) => ({ stringValue: orgId })),
            },
          },
        },
      });
    } else if (orgId) {
      requestBody.structuredQuery.where.compositeFilter!.filters.push({
        fieldFilter: {
          field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType!)}` },
          op: 'ARRAY_CONTAINS',
          value: { stringValue: orgId },
        },
      });
    }

    if (!_isEmpty(grades)) {
      requestBody.structuredQuery.where.compositeFilter!.filters.push({
        fieldFilter: {
          field: { fieldPath: `userData.grade` },
          op: 'IN',
          value: {
            arrayValue: {
              values: grades.map((grade) => ({ stringValue: grade })),
            },
          },
        },
      });
    }

    if (filter.value && ['Completed', 'Started', 'Assigned'].includes(filter.value)) {
      requestBody.structuredQuery.where.compositeFilter!.filters.push({
        fieldFilter: {
          field: { fieldPath: `progress.${filter.taskId?.replace(/-/g, '_')}` },
          op: 'EQUAL',
          value: { stringValue: filter.value.toLowerCase() },
        },
      });
    } else if (!_isEmpty(filter)) {
      requestBody.structuredQuery.where.compositeFilter!.filters.push({
        fieldFilter: {
          field: { fieldPath: `userData.${filter.field}` },
          op: 'EQUAL',
          value: { stringValue: filter.value! },
        },
      });
    }
  } else {
    const currentDate = new Date().toISOString();
    requestBody.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'dateClosed' },
        op: 'GREATER_THAN_OR_EQUAL',
        value: { timestampValue: currentDate },
      },
    };
  }

  if (!_isEmpty(orderBy)) {
    requestBody.structuredQuery.orderBy = orderBy;
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

export const getFilteredScoresRequestBody = ({
  adminId,
  orgId,
  orgType,
  orgArray = [],
  filter,
  select = ['scores', 'reliable', 'engagementFlags'],
  aggregationQuery,
  grades = [],
  paginate = true,
  page,
  pageLimit,
}: FilteredScoresRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'runs',
          allDescendants: true,
        },
      ],
    },
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    requestBody.structuredQuery.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }

  requestBody.structuredQuery.where = {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: 'assignmentId' },
            op: 'EQUAL',
            value: { stringValue: adminId },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: 'taskId' },
            op: 'EQUAL',
            value: { stringValue: filter.taskId },
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

  if (!_isEmpty(orgArray)) {
    requestBody.structuredQuery.where.compositeFilter!.filters.push({
      fieldFilter: {
        field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType!)}` },
        op: 'ARRAY_CONTAINS_ANY',
        value: {
          arrayValue: {
            values: orgArray.map((orgId) => ({ stringValue: orgId })),
          },
        },
      },
    });
  } else if (orgId) {
    requestBody.structuredQuery.where.compositeFilter!.filters.push({
      fieldFilter: {
        field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType!)}` },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: orgId },
      },
    });
  }

  if (!_isEmpty(grades)) {
    requestBody.structuredQuery.where.compositeFilter!.filters.push({
      fieldFilter: {
        field: { fieldPath: `userData.grade` },
        op: 'IN',
        value: {
          arrayValue: {
            values: grades.map((grade) => ({ stringValue: grade })),
          },
        },
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

export const getScoresRequestBody = ({
  runIds,
  orgType,
  orgId,
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = ['scores'],
}: ScoresRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'runs',
          allDescendants: true,
        },
      ],
    },
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    requestBody.structuredQuery.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }

  requestBody.structuredQuery.where = {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: 'id' },
            op: 'IN',
            value: {
              arrayValue: {
                values: runIds.map((id) => ({ stringValue: id })),
              },
            },
          },
        },
      ],
    },
  };

  if (orgId) {
    requestBody.structuredQuery.where.compositeFilter!.filters.push({
      fieldFilter: {
        field: { fieldPath: `readOrgs.${pluralizeFirestoreCollection(orgType!)}` },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: orgId },
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

export const assignmentCounter = async (
  adminId: string,
  orgType: string,
  orgId: string,
  filters: any[] = [],
  orderBy: any[] = []
): Promise<number> => {
  const axiosInstance = getAxiosInstance();
  const requestBody = getAssignmentsRequestBody({
    adminId,
    orgType,
    orgId,
    aggregationQuery: true,
    paginate: false,
    filter: filters[0],
    orderBy,
  });

  const { data } = await axiosInstance.post(':runAggregationQuery', requestBody);
  return Number(convertValues(data[0].result?.aggregateFields?.count));
};

export const assignmentPageFetcher = async (
  adminId: string,
  orgType: string,
  orgId: string,
  pageLimit: number,
  page: number,
  includeScores = false,
  select?: (typeof assignmentSelectFields)[number][],
  paginate = true,
  filters: any[] = [],
  orderBy: any[] = []
): Promise<Assignment[]> => {
  const axiosInstance = getAxiosInstance();
  const requestBody = getAssignmentsRequestBody({
    adminId,
    orgType,
    orgId,
    aggregationQuery: false,
    pageLimit,
    page,
    paginate,
    select,
    filter: filters[0],
    orderBy,
  });

  const { data } = await axiosInstance.post(':runQuery', requestBody);
  const assignments = mapFields(data) as unknown as Assignment[];

  if (includeScores) {
    const runIds = _flatten(
      assignments.map((assignment) =>
        assignment.assessments.map((assessment) => assessment.runId)
      )
    );

    if (runIds.length > 0) {
      const scoresRequestBody = getScoresRequestBody({
        runIds,
        orgType,
        orgId,
        aggregationQuery: false,
        paginate: false,
      });

      const { data: scoresData } = await axiosInstance.post(':runQuery', scoresRequestBody);
      const runs = mapFields(scoresData) as unknown as Run[];

      const runsByAssignment = _groupBy(runs, 'assignmentId');
      assignments.forEach((assignment) => {
        const assignmentRuns = runsByAssignment[assignment.id] || [];
        assignment.assessments.forEach((assessment) => {
          const run = _find(assignmentRuns, { taskId: assessment.taskId });
          if (run) {
            assessment.scores = run.scores;
          }
        });
      });
    }
  }

  return assignments;
};

export const getUserAssignments = async (roarUid: string): Promise<Assignment[]> => {
  const axiosInstance = getAxiosInstance();
  const requestBody = getAssignmentsRequestBody({
    adminId: roarUid,
    aggregationQuery: false,
    paginate: false,
  });

  const { data } = await axiosInstance.post(':runQuery', requestBody);
  return mapFields(data) as unknown as Assignment[];
};

export const assignmentFetchAll = async (
  adminId: string,
  orgType: string,
  orgId: string,
  includeScores = false
): Promise<Assignment[]> => {
  const count = await assignmentCounter(adminId, orgType, orgId);
  const pageSize = 100;
  const pages = Math.ceil(count / pageSize);
  const assignments = [];

  for (let page = 0; page < pages; page++) {
    const pageAssignments = await assignmentPageFetcher(
      adminId,
      orgType,
      orgId,
      pageSize,
      page,
      includeScores,
      undefined,
      true,
      [],
      []
    );
    assignments.push(...pageAssignments);
  }

  return assignments;
}; 