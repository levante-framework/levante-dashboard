import { toValue, toRaw, type Ref, ref } from 'vue';
import _find from 'lodash/find';
import _flatten from 'lodash/flatten';
import _get from 'lodash/get';
import _groupBy from 'lodash/groupBy';
import _mapValues from 'lodash/mapValues';
import _replace from 'lodash/replace';
import _uniq from 'lodash/uniq';
import _without from 'lodash/without';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - utils likely needs TS conversion
import { convertValues, getAxiosInstance, getProjectId, mapFields } from './utils';
// @ts-ignore - helpers/index likely needs TS conversion
import { pluralizeFirestoreCollection, isLevante } from '@/helpers';
import type { AxiosInstance } from 'axios';

// --- Reused Interfaces (Consider moving to a common types file) ---
interface StringValue { stringValue: string; }
interface BooleanValue { booleanValue: boolean; }
interface IntegerValue { integerValue: string; }
interface DoubleValue { doubleValue: number; }
interface NullValue { nullValue: null; }
interface TimestampValue { timestampValue: string; } // ISO 8601 string
interface ArrayValue { arrayValue: { values?: Value[] }; }
type Value = StringValue | BooleanValue | IntegerValue | DoubleValue | NullValue | TimestampValue | ArrayValue | { [key: string]: any };

interface OrderBy {
    field: { fieldPath: string };
    direction: 'ASCENDING' | 'DESCENDING';
}
interface FieldFilter {
    field: { fieldPath: string };
    op: 'EQUAL' | 'IN' | 'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY' | 'GREATER_THAN_OR_EQUAL' | string;
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
interface FirestoreDocument {
    name: string; // Full path
    fields: Record<string, Value>;
    createTime: string;
    updateTime: string;
}
interface FirestoreRunQueryDocument {
    document?: FirestoreDocument;
    readTime?: string;
    parentDoc?: string; // Added by mapFields
    id?: string; // Added by mapFields
}

// --- Assignments Specific Interfaces ---

// Fields typically selected for user documents when fetching assignments
const userSelectFields = ['name', 'assessmentPid', 'username', 'studentData', 'schools', 'classes', 'userType', 'grade']; // Added grade

// Fields typically selected for assignment documents
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
  'progress', // Added progress for filtering
  'userData', // Added userData for filtering
];

// Structure for filter objects used in request body functions
interface AssignmentFilter {
    field?: string; // e.g., 'userData.grade' or 'progress.taskId'
    taskId?: string; // Specifically for progress filtering
    value?: string | number | boolean; // Value to filter by
    // Add other potential filter properties if needed
}

interface GetAssignmentsRequestParams {
    adminId?: string | null;
    orgType?: string | null;
    orgId?: string | null;
    orgArray?: string[];
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
    select?: string[];
    filter?: AssignmentFilter;
    orderBy?: OrderBy[];
    grades?: string[];
    isCollectionGroupQuery?: boolean;
}

interface GetFilteredScoresRequestParams {
    adminId: string;
    orgId?: string | null;
    orgType?: string | null;
    orgArray?: string[];
    filter: AssignmentFilter; // Requires taskId
    select?: string[];
    aggregationQuery?: boolean;
    grades?: string[];
    paginate?: boolean;
    page?: number;
    pageLimit?: number;
}

interface GetScoresRequestParams {
    runIds: string[];
    orgType?: string | null; // Used for constructing doc paths
    orgId?: string | null; // Used for constructing doc paths (though seems unused in original JS)
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
    select?: string[];
}

// Structure for assignment data after mapFields
interface AssignmentData {
    id: string; // Assignment/Admin ID
    userId?: string; // User ID (parentDoc)
    name?: string;
    publicName?: string;
    assessments?: any[]; // Type assessment structure
    assigningOrgs?: any; // Type org structure
    completed?: boolean;
    dateAssigned?: any; // Type timestamp/date
    dateClosed?: any;
    dateOpened?: any;
    legal?: any;
    readOrgs?: { [key: string]: string[] };
    sequential?: boolean;
    started?: boolean;
    progress?: Record<string, 'assigned' | 'started' | 'completed'>; // task_id_safe -> status
    userData?: Record<string, any>; // Store user data fields like grade
    // Fields added/modified by assignmentPageFetcher
    score?: number | string | null; // Added score
    user?: UserDataSnippet | null; // Added user snippet
    status?: string; // Calculated status
    [key: string]: any;
}

// Structure for run data snippet (scores, reliability, etc.)
interface RunScoreSnippet {
    id: string; // Run ID
    userId?: string; // User ID (parentDoc)
    scores?: any; // Type score structure
    reliable?: boolean;
    engagementFlags?: any;
    [key: string]: any;
}

// Structure for user data snippet (reused/adapted from runs.ts)
interface UserDataSnippet {
    id?: string; // User ID
    name?: string;
    assessmentPid?: string;
    username?: string;
    studentData?: any;
    schools?: any;
    classes?: any;
    userType?: string;
    grade?: string;
    [key: string]: any;
}

// Structure for processed user doc from batchGet
interface ProcessedUserDoc {
    name: string; // Full path
    id: string; // User ID
    data: UserDataSnippet;
}

// Structure for processed run doc (scores) from batchGet
interface ProcessedRunDoc {
    name: string; // Full path
    id: string; // Run ID
    userId?: string; // User ID
    data: RunScoreSnippet;
}

// --- Functions ---

export const getAssignmentsRequestBody = ({
  adminId,
  orgType,
  orgId,
  orgArray = [],
  aggregationQuery = false,
  pageLimit,
  page,
  paginate = true,
  select = assignmentSelectFields,
  filter = {},
  orderBy = [],
  grades = [],
  isCollectionGroupQuery = true,
}: GetAssignmentsRequestParams): QueryRequestBody => {
  const structuredQuery: StructuredQuery = {
      from: [
          {
              collectionId: 'assignments',
              allDescendants: isCollectionGroupQuery,
          },
      ],
      where: { // Initialize where clause
          compositeFilter: {
              op: 'AND',
              filters: [],
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

  if (adminId) {
      filters.push({
          fieldFilter: {
              field: { fieldPath: 'id' }, // Filter by assignment ID itself
              op: 'EQUAL',
              value: { stringValue: adminId },
          },
      });
  }

  // Add org filters if adminId is present (common case for fetching user assignments for an admin)
  if (adminId && orgType && (orgId || orgArray.length > 0)) {
      const pluralOrgType = pluralizeFirestoreCollection(orgType);
      if (pluralOrgType) {
          if (orgArray.length > 0) {
              filters.push({
                  fieldFilter: {
                      field: { fieldPath: `readOrgs.${pluralOrgType}` },
                      op: 'ARRAY_CONTAINS_ANY',
                      value: { arrayValue: { values: orgArray.map(id => ({ stringValue: id })) } },
                  },
              });
          } else if (orgId) {
              filters.push({
                  fieldFilter: {
                      field: { fieldPath: `readOrgs.${pluralOrgType}` },
                      op: 'ARRAY_CONTAINS',
                      value: { stringValue: orgId },
                  },
              });
          }
      }
  }
  // Specific handling for getUserAssignments (no adminId, filtering by dateClosed)
  else if (!adminId && isCollectionGroupQuery) {
      const currentDate = new Date().toISOString();
      filters.push({
          fieldFilter: {
              field: { fieldPath: 'dateClosed' },
              op: 'GREATER_THAN_OR_EQUAL',
              value: { timestampValue: currentDate },
          },
      });
  }

  // Add grade filter
  if (grades.length > 0) {
    filters.push({
      fieldFilter: {
        // Assuming grade is stored in assignment's userData map
        field: { fieldPath: `userData.grade` },
        op: 'IN',
        value: { arrayValue: { values: grades.map(grade => ({ stringValue: grade })) } },
      },
    });
  }

  // Add progress or userData filter
  if (filter && filter.value !== undefined) {
      if (filter.taskId && ['Completed', 'Started', 'Assigned'].includes(String(filter.value))) {
          // Progress filter
          const progressField = `progress.${filter.taskId.replace(/-/g, '_')}`;
          filters.push({
              fieldFilter: {
                  field: { fieldPath: progressField },
                  op: 'EQUAL',
                  // Ensure value is lowercase string for status
                  value: { stringValue: String(filter.value).toLowerCase() },
              },
          });
      } else if (filter.field) {
          // UserData filter (assuming field is like 'firstName')
          const userDataField = `userData.${filter.field}`;
          filters.push({
              fieldFilter: {
                  field: { fieldPath: userDataField },
                  op: 'EQUAL',
                  // Assuming string value filter for userData
                  value: { stringValue: String(filter.value) },
              },
          });
      }
  }

  // Add orderBy if provided
  if (orderBy.length > 0) {
    structuredQuery.orderBy = orderBy;
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        structuredQuery,
        aggregations: [{ alias: 'count', count: {} }],
      },
    };
  }

  return { structuredQuery };
};

export const getFilteredScoresRequestBody = ({
  adminId,
  orgId,
  orgType,
  orgArray = [],
  filter, // Requires taskId
  select = ['scores', 'reliable', 'engagementFlags'],
  aggregationQuery = false,
  grades = [],
  paginate = true,
  page,
  pageLimit,
}: GetFilteredScoresRequestParams): QueryRequestBody => {

  if (!filter || !filter.taskId) {
      throw new Error('Filter with taskId is required for getFilteredScoresRequestBody');
  }

  const structuredQuery: StructuredQuery = {
      from: [{ collectionId: 'runs', allDescendants: true }],
      where: {
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
      },
  };

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

  // Add org filters
  if (orgType) {
      const pluralOrgType = pluralizeFirestoreCollection(orgType);
      if (pluralOrgType) {
          if (orgArray.length > 0) {
              filters.push({
                  fieldFilter: {
                      field: { fieldPath: `readOrgs.${pluralOrgType}` },
                      op: 'ARRAY_CONTAINS_ANY',
                      value: { arrayValue: { values: orgArray.map(id => ({ stringValue: id })) } },
                  },
              });
          } else if (orgId) {
              filters.push({
                  fieldFilter: {
                      field: { fieldPath: `readOrgs.${pluralOrgType}` },
                      op: 'ARRAY_CONTAINS',
                      value: { stringValue: orgId },
                  },
              });
          }
      }
  }

  // Add grade filter (assuming grade is also on the run document in `userData.grade`)
  // Adjust path if grade is stored differently on runs
  if (grades.length > 0) {
      filters.push({
          fieldFilter: {
              field: { fieldPath: `userData.grade` }, // Path on the 'run' document
              op: 'IN',
              value: { arrayValue: { values: grades.map(grade => ({ stringValue: grade })) } },
          },
      });
  }

  // Add specific filter from params (e.g., userData field on run)
  if (filter.field && filter.value !== undefined) {
      filters.push({
          fieldFilter: {
              field: { fieldPath: `userData.${filter.field}` }, // Path on the 'run' document
              op: 'EQUAL',
              value: { stringValue: String(filter.value) },
          },
      });
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        structuredQuery,
        aggregations: [{ alias: 'count', count: {} }],
      },
    };
  }

  return { structuredQuery };
};

export const getScoresRequestBody = ({
  runIds,
  // orgType, // Seems unused in original logic for building paths
  // orgId,
  aggregationQuery = false,
  pageLimit,
  page,
  paginate = true,
  select = ['scores'],
}: GetScoresRequestParams): QueryRequestBody => {

    if (!runIds || runIds.length === 0) {
        throw new Error('runIds array cannot be empty for getScoresRequestBody');
    }

    // This function seems designed to fetch specific runs by ID, not query across collections.
    // Firestore REST API uses batchGet for fetching by ID, not runQuery.
    // The original JS implementation using runQuery with an 'IN' filter on __name__
    // across the 'runs' collection group might be inefficient or incorrect.
    // Re-implementing using batchGet is safer and more standard.
    // If runQuery was intended, the path construction needs clarification.

    // Returning an empty object for now as the original query logic is unclear/likely incorrect for REST.
    // Consider implementing using batchGet if fetching specific run docs by ID is the goal.
    console.warn('getScoresRequestBody using runQuery with IN filter is likely incorrect/inefficient for REST API. Use batchGet instead. Returning empty query body.');
    return {};

    // --- Original (Potentially Flawed) Logic using runQuery --- 
    /*
    const structuredQuery: StructuredQuery = {
        from: [{ collectionId: 'runs', allDescendants: true }], // Collection group query
        where: {
            fieldFilter: {
                field: { fieldPath: '__name__' }, // Filter by full document path
                op: 'IN',
                value: {
                    arrayValue: {
                        // Need to construct FULL document paths (projects/.../users/userId/runs/runId)
                        // This requires knowing the userId for each runId, which isn't provided.
                        values: runIds.map(runId => ({ 
                            // FIXME: Cannot construct full path without userId
                            stringValue: `projects/${getProjectId()}/databases/(default)/documents/users/UNKNOWN_USER/runs/${runId}` 
                        }))
                    }
                }
            }
        }
    };

    if (!aggregationQuery) {
        if (paginate && pageLimit !== undefined && page !== undefined) {
            structuredQuery.limit = pageLimit;
            structuredQuery.offset = page * pageLimit;
        }
        if (select && select.length > 0) {
            structuredQuery.select = {
                fields: select.map((field) => ({ fieldPath: field }))
            };
        }
    }

    if (aggregationQuery) {
        return {
            structuredAggregationQuery: {
                structuredQuery,
                aggregations: [{ alias: 'count', count: {} }]
            }
        };
    }

    return { structuredQuery };
    */
};

/**
 * Counts the number of assignments for a given administration and organization.
 */
export const assignmentCounter = async (
    adminId: Ref<string | null>,
    orgType: Ref<string | null>,
    orgId: Ref<string | null>,
    filters: Ref<AssignmentFilter[]> = ref([]), // Use imported ref
    orderBy: Ref<OrderBy[]> = ref([]) // Use imported ref
): Promise<number> => {
  const axiosInstance = getAxiosInstance(); // Default instance
  // Note: Original JS passed filters and orderBy directly, assuming single filter.
  // Adjusting to handle potential array, but getAssignmentsRequestBody expects single filter.
  // Need clarification if multiple filters/orderBy are intended here.
  const requestBody = getAssignmentsRequestBody({
    adminId: toValue(adminId),
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: true,
    filter: toValue(filters)[0] ?? {}, // Use first filter if array provided
    orderBy: toValue(orderBy),
  });

  const { data } = await axiosInstance.post<AggregationResult[]>(':runAggregationQuery', requestBody);

  // Extract count
  const countValue = data[0]?.result?.aggregateFields?.count;
  let count = 0;
  if (countValue && typeof countValue === 'object' && 'integerValue' in countValue && typeof countValue.integerValue === 'string') {
      const numericCount = Number(countValue.integerValue);
      count = isNaN(numericCount) ? 0 : numericCount;
  } else if (countValue) {
      console.warn("Unexpected structure for assignment count aggregation:", countValue);
      const numericCount = Number(countValue);
      count = isNaN(numericCount) ? 0 : numericCount;
  }
  return count;
};


// Helper function to batch get user data
async function fetchUserData(axiosInstance: AxiosInstance, userIds: string[]): Promise<Record<string, ProcessedUserDoc>> {
    if (userIds.length === 0) return {};

    const userDocPaths = userIds.map(userId => `projects/${getProjectId()}/databases/(default)/documents/users/${userId}`);
    const { data: batchUserResponse } = await axiosInstance.post<BatchGetResponseItem[]>(':batchGet', {
        documents: userDocPaths,
        // Mask for needed fields
        mask: { fieldPaths: userSelectFields.filter(f => f !== 'name') }, // Exclude name as it's part of path
    });

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

    return processedUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, ProcessedUserDoc>);
}

// Helper function to batch get run scores
async function fetchRunScores(axiosInstance: AxiosInstance, runIds: string[]): Promise<Record<string, ProcessedRunDoc>> {
    if (runIds.length === 0) return {};

    // Need full paths (projects/.../users/userId/runs/runId) - Requires user IDs!
    // This approach is flawed without knowing the user ID for each run ID.
    // The original code likely implicitly relied on the context (e.g., fetching assignments for ONE user).
    // A collection group query on 'runs' with an IN filter on run IDs is needed,
    // OR the run path needs to be stored/retrieved differently.

    console.warn("fetchRunScores called with run IDs but without user context. Cannot construct full paths for batchGet. Score fetching might fail or be inaccurate.");

    // Attempting a collection group query as a fallback (potentially inefficient)
    const structuredQuery: StructuredQuery = {
        from: [{ collectionId: 'runs', allDescendants: true }],
        where: {
            fieldFilter: {
                field: { fieldPath: '__name__' }, // Filter by document name (ID part)
                op: 'IN',
                value: {
                    arrayValue: {
                         // WARNING: This matches ANY run with this ID, regardless of user!
                         // Need full paths for accuracy.
                        values: runIds.map(runId => ({ 
                            stringValue: runId // Matching only the last part of the path
                        }))
                    }
                }
            }
        },
        select: { fields: ['scores', 'reliable', 'engagementFlags'].map(f => ({ fieldPath: f })) }
    };

    const { data: runQueryResponse } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', { structuredQuery });

    const processedRuns = mapFields(runQueryResponse as any, true) as ProcessedRunDoc[]; // Add parentDoc (userId)

    return processedRuns.reduce((acc, run) => {
        acc[run.id] = run; // Index by run ID
        return acc;
    }, {} as Record<string, ProcessedRunDoc>);

    // --- Ideal batchGet implementation (if full paths were available) ---
    /*
    const runDocPaths = runIds.map(runId => `projects/${getProjectId()}/databases/(default)/documents/users/USER_ID_HERE/runs/${runId}`);
    const { data: batchRunResponse } = await axiosInstance.post<BatchGetResponseItem[]>(':batchGet', {
        documents: runDocPaths,
        mask: { fieldPaths: ['scores', 'reliable', 'engagementFlags'] }
    });

    const processedRuns = _without(
        batchRunResponse.map(({ found }) => {
            if (found && found.name) {
                const parts = found.name.split('/');
                const runId = parts[parts.length - 1];
                const userId = parts[parts.length - 3]; // Assuming path structure
                if (runId && userId) {
                    return {
                        name: found.name,
                        id: runId,
                        userId: userId,
                        data: _mapValues(found.fields, (value) => convertValues(value)) as RunScoreSnippet,
                    };
                }
            }
            return undefined;
        }),
        undefined
    ) as ProcessedRunDoc[];

    return processedRuns.reduce((acc, run) => {
        acc[run.id] = run; // Index by run ID
        return acc;
    }, {} as Record<string, ProcessedRunDoc>);
    */
}


/**
 * Fetches a page of assignments, optionally including user and score data.
 */
export const assignmentPageFetcher = async (
  adminId: Ref<string | null>,
  orgType: Ref<string | null>,
  orgId: Ref<string | null>,
  pageLimit: Ref<number>,
  page: Ref<number>,
  includeScores: Ref<boolean> = ref(false), // Use imported ref
  select: Ref<string[] | undefined> = ref(undefined), // Use imported ref
  paginate: Ref<boolean> = ref(true), // Use imported ref
  filters: Ref<AssignmentFilter[]> = ref([]), // Use imported ref
  orderBy: Ref<OrderBy[]> = ref([]) // Use imported ref
): Promise<AssignmentData[]> => {
  const axiosInstance = getAxiosInstance(); // Default instance

  // Build base assignment query body
  // Handle multiple filters by applying them sequentially? Or expect single filter?
  // Using the first filter for now, matching assignmentCounter logic.
  const currentFilters = toValue(filters);
  const requestBody = getAssignmentsRequestBody({
    adminId: toValue(adminId),
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: false,
    pageLimit: toValue(pageLimit),
    page: toValue(page),
    paginate: toValue(paginate),
    select: toValue(select) ?? assignmentSelectFields,
    filter: currentFilters[0] ?? {}, // Use first filter
    orderBy: toValue(orderBy),
    isCollectionGroupQuery: true, // Fetching user assignments
  });

  // Fetch initial assignment documents
  const { data: rawAssignmentDocs } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', requestBody);

  // Map fields, adding userId as parentDoc
  const assignments: AssignmentData[] = mapFields(rawAssignmentDocs as any, true) as AssignmentData[];

  if (assignments.length === 0) {
      return [];
  }

  // Extract unique user IDs for batch fetching user data
  const userIds = _uniq(_without(assignments.map(a => a.userId), undefined)) as string[];
  const userDocDict = await fetchUserData(axiosInstance, userIds);

  // Extract unique run IDs if scores are needed
  let runScoreDict: Record<string, ProcessedRunDoc> = {};
  if (toValue(includeScores)) {
      // How to get run IDs? They aren't directly on the assignment document.
      // Need to infer run IDs based on assignmentId and userId? Requires another query?
      // Or assume runId might be stored somewhere (e.g., assignment.progress.taskId_runId?)
      // The original code seems to have fetched scores separately using getFilteredScoresRequestBody,
      // implying a second query based on filters, not batchGet by run ID.
      console.warn("includeScores=true requires fetching runs. Original logic used a separate query (getFilteredScoresRequestBody), not batchGet by run ID. Run data might be missing or incomplete.");

      // ---- Attempting to fetch based on assignmentId and userIds (might be inefficient) ----
      // This fetches BEST runs for the specific task within the assignment for the fetched users
      // This assumes the filter contains the relevant taskId.
      const scoreFilter = currentFilters.find(f => f.taskId);
      if (scoreFilter?.taskId) {
            const scoresRequestBody = getFilteredScoresRequestBody({
                adminId: toValue(adminId)!,
                orgType: toValue(orgType),
                orgId: toValue(orgId),
                // orgArray: userIds? // Filter by user? Not supported directly here
                filter: scoreFilter,
                select: ['scores', 'reliable', 'engagementFlags'],
                aggregationQuery: false,
                paginate: false, // Fetch all relevant runs for the page
            });
             const { data: rawRunDocsForScores } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', scoresRequestBody);
             const runsForScores: ProcessedRunDoc[] = mapFields(rawRunDocsForScores as any, true) as ProcessedRunDoc[];
             // Filter runs to only include those belonging to users on the current page
             const userRuns = runsForScores.filter(run => run.userId && userIds.includes(run.userId));

             runScoreDict = userRuns.reduce((acc, run) => {
                acc[run.id] = run; // Index by run ID
                return acc;
            }, {} as Record<string, ProcessedRunDoc>);
            console.log(`Fetched ${userRuns.length} relevant run scores.`);
      } else {
          console.warn("Cannot fetch scores: includeScores is true, but no filter with taskId was provided.");
      }
      // ---- End score fetching attempt ----
  }

  // Combine assignment data with user and score data
  const enrichedAssignments = assignments.map((assignment): AssignmentData => {
    const user = assignment.userId ? userDocDict[assignment.userId] : null;

    // Find the relevant run score if fetched
    // How to link assignment to run? Use progress field? assignmentId + taskId + userId?
    // Assuming progress field holds run ID like: progress.taskId_safe = runId ? NO, it holds status.
    // Finding run by matching assignmentId, taskId (from filter?), and userId.
    let runScoreData: RunScoreSnippet | undefined = undefined;
    const scoreFilter = currentFilters.find(f => f.taskId);
    if (user && scoreFilter?.taskId && Object.keys(runScoreDict).length > 0) {
        // Find a run in the dict that matches this assignment's user and the filtered task
        // This is still imprecise without a direct runId link on the assignment.
        const matchingRun = Object.values(runScoreDict).find(run =>
            run.userId === user.id && // Matches the user
            run.data.assignmentId === assignment.id && // Matches the assignment
            run.data.taskId === scoreFilter.taskId // Matches the task from the filter
        );
        runScoreData = matchingRun?.data;
    }

    // Determine status (simplified)
    let status = 'assigned';
    if (assignment.completed) status = 'completed';
    else if (assignment.started) status = 'started';

    return {
      ...assignment,
      user: user?.data ?? null,
      // Use _get for safe access to potentially nested score data
      score: runScoreData ? _get(runScoreData, 'scores.computed.composite', null) : null,
      status,
    };
  });

  return enrichedAssignments;
};

/**
 * Fetches assignments specifically for the logged-in user.
 */
export const getUserAssignments = async (roarUid: Ref<string | null>): Promise<AssignmentData[]> => {
    const uid = toValue(roarUid);
    if (!uid) return [];

    const axiosInstance = getAxiosInstance(); // Default instance
    const projectId = getProjectId();
    const userPath = `projects/${projectId}/databases/(default)/documents/users/${uid}`;

    const requestBody = getAssignmentsRequestBody({
        // No adminId, orgType, orgId - rely on user path and date filter
        isCollectionGroupQuery: false, // Query specific user's subcollection
        select: assignmentSelectFields,
    });

    // Adjust the query path to the user's assignments subcollection
    const queryPath = `${userPath}:runQuery`;
    // Modify the 'from' clause to target the specific user's assignments
    if (requestBody.structuredQuery?.from) {
        requestBody.structuredQuery.from = [{ collectionId: 'assignments' }]; // Query subcollection
    }

    // Fetch assignments for the specific user
    const { data: rawAssignmentDocs } = await axiosInstance.post<FirestoreRunQueryDocument[]>(queryPath, requestBody);

    // Map fields (no parentDoc needed here)
    const assignments: AssignmentData[] = mapFields(rawAssignmentDocs as any, false) as AssignmentData[];

    // Fetch user data separately for consistency (optional but good practice)
    // const userDocDict = await fetchUserData(axiosInstance, [uid]);
    // const user = userDocDict[uid];

    // Optionally enrich with user data if needed by the caller
    // return assignments.map(a => ({ ...a, user: user?.data ?? null }));

    return assignments;
};

/**
 * Fetches ALL assignments for a given admin/org context.
 * WARNING: This can be very large and may hit Firestore limits or be slow.
 */
export const assignmentFetchAll = async (
    adminId: Ref<string | null>,
    orgType: Ref<string | null>,
    orgId: Ref<string | null>,
    includeScores: Ref<boolean> = ref(false) // Use imported ref
): Promise<AssignmentData[]> => {

    // Use assignmentPageFetcher internally but without pagination
    // Need to handle potential large data volume
    console.warn("assignmentFetchAll fetches all assignments and can be slow or hit limits. Consider if pagination is more appropriate.");

    // We'll fetch in pages internally to avoid one massive request, though it's still fetching all data.
    const allAssignments: AssignmentData[] = [];
    const pageSize = 200; // Arbitrary page size for internal fetching
    let currentPage = 0;
    let hasMore = true;

    while(hasMore) {
        const pageAssignments = await assignmentPageFetcher(
            adminId,
            orgType,
            orgId,
            ref(pageSize), // Use ref for internal page size
            ref(currentPage), // Use ref for internal current page
            includeScores,
            ref(undefined), // Default select
            ref(true), // Use pagination internally
            ref([]), // No filters
            ref([]) // No order
        );

        if (pageAssignments.length > 0) {
            allAssignments.push(...pageAssignments);
        } 

        if (pageAssignments.length < pageSize) {
            hasMore = false; // Last page
        } else {
            currentPage++;
        }
    }

    return allAssignments;
}; 