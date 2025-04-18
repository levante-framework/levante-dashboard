import { toValue, type Ref, ref } from 'vue';
import _pick from 'lodash/pick';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
// @ts-ignore - utils likely needs TS conversion
import { convertValues, getAxiosInstance, mapFields } from './utils';
// @ts-ignore - helpers/index likely needs TS conversion
import { pluralizeFirestoreCollection } from '@/helpers';
import type { AxiosInstance } from 'axios';

// --- Reused Interfaces (Consider moving to a common types file) ---
interface StringValue { stringValue: string; }
interface BooleanValue { booleanValue: boolean; }
interface IntegerValue { integerValue: string; }
interface DoubleValue { doubleValue: number; } // Potential type mismatch
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
interface CompositeFilter {
    op: 'AND' | 'OR';
    filters: (FieldFilter | WhereFilter)[];
}
interface WhereFilter {
    fieldFilter?: FieldFilter;
    compositeFilter?: CompositeFilter;
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
interface AggregationResult {
    result?: {
        aggregateFields?: {
            [key: string]: Value;
        };
    };
    readTime?: string;
}
interface FirestoreRunQueryDocument {
    document?: {
        name: string;
        fields: Record<string, Value>;
        createTime: string;
        updateTime: string;
    };
    readTime?: string;
    parentDoc?: string;
    id?: string;
}

// --- Runs Specific Interfaces ---
interface GetRunsRequestParams {
    administrationId?: string | null;
    orgType?: string | null;
    orgId?: string | null;
    taskId?: string | null;
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
    select?: string[];
    allDescendants?: boolean;
    requireCompleted?: boolean;
}

// Structure for run data after mapFields
interface RunData {
    id: string;
    parentDoc?: string; // User ID from mapFields(data, true)
    scores?: { computed?: { composite?: any } }; // Basic structure, refine as needed
    assignmentId?: string;
    bestRun?: boolean;
    taskId?: string;
    completed?: boolean;
    readOrgs?: { [key: string]: string[] }; // e.g., { schools: ['schoolId1'] }
    [key: string]: any;
}

// Structure for user data snippet fetched in batchGet
interface UserDataSnippet {
    grade?: any;
    birthMonth?: any;
    birthYear?: any;
    schools?: { current?: string[] }; // Or other org types
    districts?: { current?: string[] };
    classes?: { current?: string[] };
    [key: string]: any;
}

// Structure for processed user doc from batchGet
interface ProcessedUserDoc {
    name: string; // Full path
    id: string; // User ID
    data: UserDataSnippet;
}

// Structure for the final combined run + user data object
interface RunWithUserData extends RunData { // Extend RunData to include all its fields
    score?: any; // Extracted score based on scoreKey
    user?: UserDataSnippet; // User data snippet
}

interface RunPageFetcherParams {
    administrationId: Ref<string | null>;
    userId?: Ref<string | null>; // Optional user ID
    orgType: Ref<string | null>;
    orgId: Ref<string | null>;
    taskId?: Ref<string | null>; // Optional task ID
    pageLimit?: Ref<number>;
    page?: Ref<number>;
    select?: Ref<string[]>;
    scoreKey?: Ref<string>;
    paginate?: Ref<boolean>;
}

// --- Functions ---

/**
 * Constructs the request body for fetching runs based on the provided parameters.
 */
export const getRunsRequestBody = ({
  administrationId,
  orgType,
  orgId,
  taskId,
  aggregationQuery = false,
  pageLimit,
  page,
  paginate = true,
  select = ['scores.computed.composite'],
  allDescendants = true,
  requireCompleted = false,
}: GetRunsRequestParams): QueryRequestBody => {
  const structuredQuery: StructuredQuery = {
      from: [{ collectionId: 'runs', allDescendants: allDescendants }],
      where: {
          compositeFilter: {
              op: 'AND',
              // Initialize with bestRun filter, others are added conditionally
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
      },
  };

  // Ensure filters array exists
  const filters = structuredQuery.where!.compositeFilter!.filters;

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      structuredQuery.limit = pageLimit;
      structuredQuery.offset = page * pageLimit;
    }

    if (select && select.length > 0) {
      structuredQuery.select = {
        fields: select.map((field) => ({ fieldPath: field })),
      };
    }
  }

  if (administrationId) {
      filters.push({
          fieldFilter: {
              field: { fieldPath: 'assignmentId' },
              op: 'EQUAL',
              value: { stringValue: administrationId },
          },
      });
  }

  if (orgId && orgType) {
    const pluralOrgType = pluralizeFirestoreCollection(orgType);
    if (pluralOrgType) { // Ensure pluralization didn't fail
        filters.push({
            fieldFilter: {
                // Path depends on how readOrgs are stored
                field: { fieldPath: `readOrgs.${pluralOrgType}` },
                op: 'ARRAY_CONTAINS',
                value: { stringValue: orgId },
            },
        });
    }
  }

  if (taskId) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'taskId' },
        op: 'EQUAL',
        value: { stringValue: taskId },
      },
    });
  }

  if (requireCompleted) {
    filters.push({
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
        structuredQuery, // Use the constructed query
        aggregations: [
          { alias: 'count', count: {} },
        ],
      },
    };
  }

  return { structuredQuery };
};

/**
 * Counts the number of runs for a given administration and organization.
 */
export const runCounter = async (
    administrationId: Ref<string | null>,
    orgType: Ref<string | null>,
    orgId: Ref<string | null>
): Promise<number> => {
  const axiosInstance = getAxiosInstance('app'); // Assume returns AxiosInstance
  const requestBody = getRunsRequestBody({
    administrationId: toValue(administrationId),
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: true,
    // Defaults from getRunsRequestBody will apply (bestRun=true, etc.)
  });

  const { data } = await axiosInstance.post<AggregationResult[]>(':runAggregationQuery', requestBody);

  // Extract count, assuming integerValue structure
  const countValue = data[0]?.result?.aggregateFields?.count;
  let count = 0;
  if (countValue && typeof countValue === 'object' && 'integerValue' in countValue && typeof countValue.integerValue === 'string') {
      const numericCount = Number(countValue.integerValue);
      count = isNaN(numericCount) ? 0 : numericCount;
  } else if (countValue) {
      console.warn("Unexpected structure for run count aggregation:", countValue);
      // Fallback attempt
      const numericCount = Number(countValue);
      count = isNaN(numericCount) ? 0 : numericCount;
  }
  return count;
};

/**
 * Fetches run page data for a given set of parameters.
 */
export const runPageFetcher = async ({
  administrationId,
  userId, // Optional Ref<string | null>
  orgType,
  orgId,
  taskId, // Optional Ref<string | null>
  pageLimit = ref(10),
  page = ref(0),
  select = ref(['scores.computed.composite']),
  scoreKey = ref('scores.computed.composite'),
  paginate = ref(true),
}: RunPageFetcherParams): Promise<RunWithUserData[]> => {
  const appAxiosInstance = getAxiosInstance('app'); // Assume returns AxiosInstance
  const currentUserId = userId ? toValue(userId) : undefined;

  const requestBody = getRunsRequestBody({
    administrationId: toValue(administrationId),
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    taskId: taskId ? toValue(taskId) : undefined,
    allDescendants: currentUserId === undefined,
    aggregationQuery: false,
    pageLimit: toValue(paginate) ? toValue(pageLimit) : undefined,
    page: toValue(paginate) ? toValue(page) : undefined,
    paginate: toValue(paginate),
    select: toValue(select),
    requireCompleted: false, // Default, can be added to params if needed
  });

  // Determine query endpoint based on whether userId is provided
  const runQuery = currentUserId === undefined ? ':runQuery' : `/users/${currentUserId}:runQuery`;

  // Fetch raw run documents
  const { data: rawRunDocs } = await appAxiosInstance.post<FirestoreRunQueryDocument[]>(runQuery, requestBody);

  // Map fields, adding parentDoc (user ID) if runQuery was specific to a user
  const runData: RunData[] = mapFields(rawRunDocs as any, currentUserId !== undefined) as RunData[];

  // Extract unique user document paths from the raw run docs
  const userDocPaths: string[] = _uniq(
    _without(
      rawRunDocs.map((runDoc) => {
        // Extract user path from run document name (e.g., projects/.../users/userId/runs/runId)
        if (runDoc.document?.name) {
          return runDoc.document.name.split('/runs/')[0];
        }
        return undefined;
      }),
      undefined,
    )
  ) as string[];

  if (userDocPaths.length === 0) {
      // No associated users found, return runs without user data
      console.warn("No user document paths found for fetched runs.");
      // Construct the return object without the explicit id:, spread will handle it.
      return runData.map(run => ({
          score: _get(run, toValue(scoreKey)),
          user: undefined,
          ...run,
      }));
  }

  // Batch get associated user documents (only specific fields)
  const { data: batchUserResponse } = await appAxiosInstance.post<BatchGetResponseItem[]>(':batchGet', {
    documents: userDocPaths,
    // Mask to fetch only necessary user fields
    mask: { fieldPaths: ['grade', 'birthMonth', 'birthYear', 'schools.current', 'districts.current', 'classes.current'] },
  });

  // Process the batch user response
  const processedUsers = _without(
      batchUserResponse.map(({ found }) => {
          if (found && found.name) {
              const userId = found.name.split('/users/')[1];
              if (userId) {
                  return {
                      name: found.name,
                      id: userId,
                      data: _mapValues(found.fields, (value) => convertValues(value)) as UserDataSnippet,
                  };
              }
          }
          return undefined;
      }),
      undefined
  ) as ProcessedUserDoc[];

  // Create a dictionary for easy user lookup: userId -> ProcessedUserDoc
  const userDocDict = processedUsers.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<string, ProcessedUserDoc>);

  // Combine run data with fetched user data
  const runsWithUsers: RunWithUserData[] = runData.map((run) => {
    const userIdFromRun = run.parentDoc;
    const user = userIdFromRun ? userDocDict[userIdFromRun] : undefined;

    // Construct the return object without the explicit id:, spread will handle it.
    return {
      score: _get(run, toValue(scoreKey)),
      user: user?.data,
      ...run,
    };
  });

  return runsWithUsers;
}; 